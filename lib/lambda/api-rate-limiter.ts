import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as https from 'https';
import * as http from 'http';

interface ApiRequest {
  method: string;
  path: string;
  headers?: { [key: string]: string };
  body?: string;
  requestId: string;
  operation: string;
  model: string;
  args: any;
}

interface RateLimitConfig {
  frequencyInSeconds: number;
  limit: number;
}

interface ApiCredentials {
  apiKey?: string;
  authToken?: string;
  [key: string]: any;
}

interface JobResult {
  requestId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  completedAt?: string;
}

const secretsManager = new AWS.SecretsManager();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// In-memory rate limiting store (in production, use Redis or DynamoDB)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const handler = async (event: SQSEvent): Promise<void> => {
  const secretName = process.env.SECRET_NAME!;
  const apiEndpoint = process.env.API_ENDPOINT!;
  const jobResultsTable = process.env.JOB_RESULTS_TABLE!;
  const rateLimitConfig: RateLimitConfig = {
    frequencyInSeconds: parseInt(process.env.FREQUENCY_IN_SECONDS || '60'),
    limit: parseInt(process.env.LIMIT || '100')
  };

  // Get API credentials from Secrets Manager
  let credentials: ApiCredentials = {};
  try {
    const secretResponse = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if (secretResponse.SecretString) {
      credentials = JSON.parse(secretResponse.SecretString);
    }
  } catch (error) {
    console.error('Failed to retrieve API credentials:', error);
    throw error;
  }

  // Process each SQS message
  for (const record of event.Records) {
    try {
      await processApiRequest(record, apiEndpoint, credentials, rateLimitConfig, jobResultsTable);
    } catch (error) {
      console.error('Failed to process API request:', error);
      // Store error result
      const apiRequest: ApiRequest = JSON.parse(record.body);
      await storeJobResult(jobResultsTable, {
        requestId: apiRequest.requestId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date().toISOString()
      });
    }
  }
};

async function processApiRequest(
  record: SQSRecord,
  apiEndpoint: string,
  credentials: ApiCredentials,
  rateLimitConfig: RateLimitConfig,
  jobResultsTable: string
): Promise<void> {
  const apiRequest: ApiRequest = JSON.parse(record.body);
  
  // Check rate limit
  const now = Date.now();
  const windowStart = Math.floor(now / (rateLimitConfig.frequencyInSeconds * 1000));
  const rateLimitKey = `${apiEndpoint}:${windowStart}`;
  
  const currentUsage = rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: windowStart };
  
  if (currentUsage.count >= rateLimitConfig.limit) {
    const waitTime = (currentUsage.resetTime + 1) * rateLimitConfig.frequencyInSeconds * 1000 - now;
    console.log(`Rate limit exceeded. Waiting ${waitTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Make the API request
  try {
    const response = await makeHttpRequest(apiEndpoint, apiRequest, credentials);
    
    // Update rate limit counter
    currentUsage.count++;
    rateLimitStore.set(rateLimitKey, currentUsage);
    
    // Clean up old entries
    cleanupRateLimitStore(rateLimitConfig.frequencyInSeconds);
    
    console.log(`API request successful for ${apiRequest.requestId}:`, response);
    
    // Store successful result
    await storeJobResult(jobResultsTable, {
      requestId: apiRequest.requestId,
      status: 'COMPLETED',
      result: response,
      completedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`API request failed for ${apiRequest.requestId}:`, error);
    throw error;
  }
}

async function storeJobResult(tableName: string, jobResult: JobResult): Promise<void> {
  try {
    await dynamodb.put({
      TableName: tableName,
      Item: {
        ...jobResult,
        ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hour TTL
      }
    }).promise();
    
    console.log(`Stored job result for ${jobResult.requestId}`);
  } catch (error) {
    console.error('Failed to store job result:', error);
    throw error;
  }
}

function makeHttpRequest(
  endpoint: string,
  request: ApiRequest,
  credentials: ApiCredentials
): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint + request.path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AWS-AppSync-RateLimiter/1.0',
        ...request.headers,
      } as { [key: string]: string },
    };
    
    // Add authentication headers
    if (credentials.apiKey) {
      options.headers['X-API-Key'] = credentials.apiKey;
    }
    if (credentials.authToken) {
      options.headers['Authorization'] = `Bearer ${credentials.authToken}`;
    }
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (request.body) {
      req.write(request.body);
    }
    
    req.end();
  });
}

function cleanupRateLimitStore(frequencyInSeconds: number): void {
  const now = Date.now();
  const cutoff = Math.floor(now / (frequencyInSeconds * 1000)) - 1;
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}
