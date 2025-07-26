import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';

interface JobResult {
  requestId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  completedAt?: string;
}

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  const endpoint = process.env.APPSYNC_ENDPOINT!;
  
  for (const record of event.Records) {
    try {
      await processStreamRecord(record, endpoint);
    } catch (error) {
      console.error('Failed to process stream record:', error);
      // Continue processing other records
    }
  }
};

async function processStreamRecord(record: DynamoDBRecord, endpoint: string): Promise<void> {
  // Only process INSERT and MODIFY events where status changed to COMPLETED or FAILED
  if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
    const newImage = record.dynamodb?.NewImage;
    const oldImage = record.dynamodb?.OldImage;
    
    if (!newImage) return;
    
    const jobResult: JobResult = {
      requestId: newImage.requestId?.S || '',
      status: (newImage.status?.S as JobResult['status']) || 'PENDING',
      result: newImage.result ? JSON.parse(newImage.result.S || '{}') : undefined,
      error: newImage.error?.S,
      completedAt: newImage.completedAt?.S,
    };
    
    // Only notify if status changed to COMPLETED or FAILED
    const oldStatus = oldImage?.status?.S;
    const newStatus = jobResult.status;
    
    if ((newStatus === 'COMPLETED' || newStatus === 'FAILED') && oldStatus !== newStatus) {
      await publishJobCompletion(endpoint, jobResult);
    }
  }
}

async function publishJobCompletion(endpoint: string, jobResult: JobResult): Promise<void> {
  const mutation = `
    mutation PublishJobCompletion($input: JobResultInput!) {
      publishJobCompletion(input: $input) {
        requestId
        status
        result
        error
        completedAt
      }
    }
  `;
  
  const variables = {
    input: jobResult
  };
  
  try {
    // In a real implementation, you would use AWS AppSync's real-time subscriptions
    // For now, we'll use a custom mutation that triggers the subscription
    console.log(`Publishing job completion for ${jobResult.requestId}:`, jobResult);
    
    // This would typically use AppSync's GraphQL endpoint to publish the subscription
    // The actual implementation would depend on your specific subscription setup
    
  } catch (error) {
    console.error('Failed to publish job completion:', error);
    throw error;
  }
}
