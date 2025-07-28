import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Cognito Admin API called:', JSON.stringify(event, null, 2));

  try {
    // Verify the user has admin permissions
    const userGroups = event.requestContext.authorizer?.claims['cognito:groups'];
    console.log('User groups:', userGroups);
    
    if (!userGroups || !userGroups.includes('admins')) {
      console.log('Access denied - user not in admins group');
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({ error: 'Insufficient permissions - admin access required' })
      };
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('USER_POOL_ID environment variable not set');
    }

    console.log('Listing users from User Pool:', userPoolId);

    // List users from Cognito User Pool
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 60, // Adjust as needed
      AttributesToGet: ['email', 'given_name', 'family_name', 'email_verified']
    });

    const response = await cognitoClient.send(command);
    console.log('Cognito response:', JSON.stringify(response, null, 2));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        users: response.Users || [],
        paginationToken: response.PaginationToken
      })
    };

  } catch (error) {
    console.error('Error listing Cognito users:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Failed to list users',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
