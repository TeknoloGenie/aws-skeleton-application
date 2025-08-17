import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

interface ImpersonationEvent {
  adminUserId: string;
  targetUserId: string;
  sessionDuration?: number; // in minutes, default 60
}

/**
 * Handle admin user impersonation
 */
export const handler = async (event: ImpersonationEvent) => {
  console.log('User impersonation request:', JSON.stringify(event, null, 2));

  const { adminUserId, targetUserId, sessionDuration = 60 } = event;
  const userPoolId = process.env.USER_POOL_ID;
  const logTableName = `${process.env.APP_NAME}-${process.env.STAGE}-Log`;

  try {
    // Verify admin user has impersonation permissions
    const adminUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: adminUserId
    }));

    const adminGroups = adminUser.UserAttributes?.find(attr => attr.Name === 'cognito:groups')?.Value;
    if (!adminGroups?.includes('admins')) {
      throw new Error('User does not have admin privileges');
    }

    // Get target user details
    const targetUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: targetUserId
    }));

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Log the impersonation action
    await logImpersonation(adminUserId, targetUserId, logTableName);

    // Generate impersonation session token
    const impersonationToken = generateImpersonationToken(adminUserId, targetUserId, sessionDuration);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        impersonationToken,
        targetUser: {
          id: targetUserId,
          email: targetUser.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
          name: targetUser.UserAttributes?.find(attr => attr.Name === 'name')?.Value
        },
        sessionExpiry: new Date(Date.now() + sessionDuration * 60 * 1000).toISOString()
      })
    };

  } catch (error) {
    console.error('Impersonation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the failed attempt
    await logImpersonationFailure(adminUserId, targetUserId, errorMessage, logTableName);

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
};

/**
 * Log successful impersonation
 */
async function logImpersonation(adminUserId: string, targetUserId: string, tableName: string) {
  const logEntry = {
    id: require('crypto').randomUUID(),
    userId: adminUserId,
    action: 'impersonate',
    component: 'admin-dashboard',
    level: 'info',
    metadata: {
      targetUserId,
      targetUserEmail: 'encrypted', // Would be encrypted in real implementation
      impersonationType: 'admin_initiated',
      userAgent: 'admin-dashboard',
      ipAddress: 'admin-internal'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await dynamodb.send(new PutCommand({
    TableName: tableName,
    Item: logEntry
  }));
}

/**
 * Log failed impersonation attempt
 */
async function logImpersonationFailure(adminUserId: string, targetUserId: string, error: string, tableName: string) {
  const logEntry = {
    id: require('crypto').randomUUID(),
    userId: adminUserId,
    action: 'impersonate-failed',
    component: 'admin-dashboard',
    level: 'error',
    metadata: {
      targetUserId,
      error,
      failureReason: error,
      userAgent: 'admin-dashboard',
      ipAddress: 'admin-internal'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await dynamodb.send(new PutCommand({
    TableName: tableName,
    Item: logEntry
  }));
}

/**
 * Generate impersonation token (simplified implementation)
 */
function generateImpersonationToken(adminUserId: string, targetUserId: string, duration: number): string {
  const payload = {
    adminUserId,
    targetUserId,
    impersonation: true,
    exp: Math.floor(Date.now() / 1000) + (duration * 60),
    iat: Math.floor(Date.now() / 1000)
  };

  // In a real implementation, this would be a proper JWT token
  // For now, we'll use a base64 encoded payload
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Validate impersonation token
 */
export const validateImpersonationToken = (token: string): { valid: boolean; payload?: any } => {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
};