import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  MessageActionType
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Cognito Admin API called:', JSON.stringify(event, null, 2));

  try {
    // Verify the user has admin permissions
    const claims = event.requestContext.authorizer?.claims;
    console.log('All claims:', JSON.stringify(claims, null, 2));
    
    const userGroups = claims?.['cognito:groups'];
    console.log('User groups raw:', userGroups, 'Type:', typeof userGroups);
    
    // Handle different group formats (string, array, or comma-separated)
    let groupsArray: string[] = [];
    if (typeof userGroups === 'string') {
      // Groups might be comma-separated string or JSON array string
      try {
        groupsArray = JSON.parse(userGroups);
      } catch {
        groupsArray = userGroups.split(',').map(g => g.trim());
      }
    } else if (Array.isArray(userGroups)) {
      groupsArray = userGroups;
    }
    
    console.log('Processed groups array:', groupsArray);
    
    if (!groupsArray.includes('admins')) {
      console.log('Access denied - user not in admins group. Available groups:', groupsArray);
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'Insufficient permissions - admin access required',
          userGroups: groupsArray,
          debug: {
            rawGroups: userGroups,
            groupsType: typeof userGroups
          }
        })
      };
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('USER_POOL_ID environment variable not set');
    }

    const httpMethod = event.httpMethod;
    console.log('HTTP Method:', httpMethod);

    if (httpMethod === 'GET') {
      return await handleListUsers(userPoolId);
    } else if (httpMethod === 'POST') {
      return await handleCreateUser(userPoolId, event.body);
    } else {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify({ 
          error: 'Method not allowed',
          allowedMethods: ['GET', 'POST']
        })
      };
    }

  } catch (error) {
    console.error('Error in Cognito Admin API:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function handleListUsers(userPoolId: string): Promise<APIGatewayProxyResult> {
  console.log('Listing users from User Pool:', userPoolId);

  // List users from Cognito User Pool
  const command = new ListUsersCommand({
    UserPoolId: userPoolId,
    Limit: 60, // Adjust as needed
    AttributesToGet: ['email', 'given_name', 'family_name', 'email_verified']
  });

  const response = await cognitoClient.send(command);
  console.log('Cognito list users response:', JSON.stringify(response, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify({
      users: response.Users || [],
      paginationToken: response.PaginationToken
    })
  };
}

async function handleCreateUser(userPoolId: string, requestBody: string | null): Promise<APIGatewayProxyResult> {
  if (!requestBody) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Request body is required'
      })
    };
  }

  let userData;
  try {
    userData = JSON.parse(requestBody);
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Invalid JSON in request body'
      })
    };
  }

  const { email, givenName, familyName, temporaryPassword, sendEmail } = userData;

  if (!email || !givenName || !familyName || !temporaryPassword) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Missing required fields: email, givenName, familyName, temporaryPassword'
      })
    };
  }

  console.log('Creating user:', { email, givenName, familyName, sendEmail });

  try {
    // Create the user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email, // Use email as username
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: givenName },
        { Name: 'family_name', Value: familyName },
        { Name: 'email_verified', Value: 'true' }
      ],
      TemporaryPassword: temporaryPassword,
      MessageAction: sendEmail ? MessageActionType.RESEND : MessageActionType.SUPPRESS
    });

    const createResponse = await cognitoClient.send(createCommand);
    console.log('User created successfully:', JSON.stringify(createResponse, null, 2));

    // Set permanent password if provided
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: temporaryPassword,
      Permanent: true
    });

    await cognitoClient.send(setPasswordCommand);
    console.log('Password set as permanent');

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({
        message: 'User created successfully',
        user: {
          username: createResponse.User?.Username,
          email: email,
          status: createResponse.User?.UserStatus
        }
      })
    };

  } catch (error) {
    console.error('Error creating user:', error);
    
    let errorMessage = 'Failed to create user';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Cognito errors
      if (error.name === 'UsernameExistsException') {
        statusCode = 409;
        errorMessage = 'User with this email already exists';
      } else if (error.name === 'InvalidPasswordException') {
        statusCode = 400;
        errorMessage = 'Password does not meet requirements';
      } else if (error.name === 'InvalidParameterException') {
        statusCode = 400;
        errorMessage = 'Invalid parameters provided';
      }
    }
    
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: errorMessage
      })
    };
  }
}
