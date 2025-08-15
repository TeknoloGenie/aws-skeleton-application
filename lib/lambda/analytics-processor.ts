import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import * as crypto from 'crypto';

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

interface AnalyticsEvent {
  userId: string;
  action: string;
  component: string;
  level: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface BatchLogEvent {
  events: AnalyticsEvent[];
}

const SENSITIVE_FIELDS = ['email', 'phone', 'address', 'password', 'token', 'ssn', 'creditCard'];
const ENCRYPTION_KEY = process.env.ANALYTICS_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypt sensitive data in metadata
 */
function encryptSensitiveData(metadata: Record<string, any>): Record<string, any> {
  if (!metadata) return metadata;

  const encrypted = { ...metadata };
  
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
        let encryptedValue = cipher.update(value, 'utf8', 'hex');
        encryptedValue += cipher.final('hex');
        encrypted[key] = `encrypted:${encryptedValue}`;
      }
    }
  }

  return encrypted;
}

/**
 * Process batch of analytics events
 */
export const handler = async (event: SQSEvent) => {
  console.log('Processing analytics batch:', JSON.stringify(event, null, 2));

  const tableName = `${process.env.APP_NAME}-${process.env.STAGE}-Log`;
  const batchItems: any[] = [];

  try {
    for (const record of event.Records) {
      const batchEvent: BatchLogEvent = JSON.parse(record.body);
      
      for (const analyticsEvent of batchEvent.events) {
        // Encrypt sensitive data
        const encryptedMetadata = encryptSensitiveData(analyticsEvent.metadata || {});
        
        batchItems.push({
          PutRequest: {
            Item: {
              id: crypto.randomUUID(),
              userId: analyticsEvent.userId,
              action: analyticsEvent.action,
              component: analyticsEvent.component,
              level: analyticsEvent.level,
              metadata: encryptedMetadata,
              createdAt: analyticsEvent.timestamp,
              updatedAt: analyticsEvent.timestamp,
            }
          }
        });
      }
    }

    // Process in batches of 25 (DynamoDB limit)
    const batches = [];
    for (let i = 0; i < batchItems.length; i += 25) {
      batches.push(batchItems.slice(i, i + 25));
    }

    for (const batch of batches) {
      const params = {
        RequestItems: {
          [tableName]: batch
        }
      };

      await dynamodb.send(new BatchWriteCommand(params));
      console.log(`Processed batch of ${batch.length} analytics events`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully processed ${batchItems.length} analytics events`,
        processedBatches: batches.length
      })
    };

  } catch (error) {
    console.error('Error processing analytics batch:', error);
    throw error;
  }
};