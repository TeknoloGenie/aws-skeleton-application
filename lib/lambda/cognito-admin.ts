import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  MessageActionType
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  requestHandler: undefined // Use default request handler, not layer
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
  if (process.env.STAGE === 'development') {
    console.log('DEBUG: handleCreateUser called with userPoolId:', userPoolId);
    console.log('DEBUG: Raw request body:', requestBody);
  }

  if (!requestBody) {
    console.log('DEBUG: No request body provided');
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
    if (process.env.STAGE === 'development') {
      console.log('DEBUG: Parsed user data:', JSON.stringify(userData, null, 2));
    }
  } catch (error) {
    console.log('DEBUG: JSON parse error:', error);
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

  if (process.env.STAGE === 'development') {
    console.log('DEBUG: Extracted fields:', {
      email: email || 'MISSING',
      givenName: givenName || 'MISSING',
      familyName: familyName || 'MISSING',
      temporaryPassword: temporaryPassword ? '[PROVIDED]' : 'MISSING',
      sendEmail: sendEmail
    });
  }

  if (!email || !givenName || !familyName || !temporaryPassword) {
    console.log('DEBUG: Missing required fields validation failed');
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Missing required fields: email, givenName, familyName, temporaryPassword',
        received: {
          email: !!email,
          givenName: !!givenName,
          familyName: !!familyName,
          temporaryPassword: !!temporaryPassword
        }
      })
    };
  }

  console.log('Creating user:', { email, givenName, familyName, sendEmail });

  try {
    // Generate username from email prefix + random 4-digit number with collision handling
    const emailPrefix = email.split('@')[0];
    let username: string;
    let attempts = 0;
    const maxAttempts = 5;

    // Try to generate a unique username
    do {
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // Generates 1000-9999
      username = `${emailPrefix}${randomDigits}`;
      attempts++;

      if (process.env.STAGE === 'development') {
        console.log(`DEBUG: Attempt ${attempts} - Generated username:`, username, 'from email:', email);
      }

      // Check if username already exists
      try {
        await cognitoClient.send(new AdminGetUserCommand({
          UserPoolId: userPoolId,
          Username: username
        }));
        
        // If we get here, user exists, try again
        if (process.env.STAGE === 'development') {
          console.log('DEBUG: Username', username, 'already exists, trying again...');
        }
        username = ''; // Reset to trigger another attempt
      } catch (error: any) {
        if (error.name === 'UserNotFoundException') {
          // Perfect! Username doesn't exist, we can use it
          if (process.env.STAGE === 'development') {
            console.log('DEBUG: Username', username, 'is available');
          }
          break;
        } else {
          // Some other error occurred
          console.error('DEBUG: Error checking username availability:', error);
          throw error;
        }
      }
    } while (!username && attempts < maxAttempts);

    if (!username) {
      throw new Error(`Failed to generate unique username after ${maxAttempts} attempts`);
    }

    // Create the user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username, // Use generated username instead of email
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: givenName },
        { Name: 'family_name', Value: familyName },
        { Name: 'email_verified', Value: 'true' }
      ],
      TemporaryPassword: temporaryPassword,
      // Fix: Use correct MessageAction for new user creation
      MessageAction: sendEmail ? undefined : MessageActionType.SUPPRESS
    });

    if (process.env.STAGE === 'development') {
      console.log('DEBUG: AdminCreateUserCommand parameters:', JSON.stringify({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: createCommand.input.UserAttributes,
        TemporaryPassword: '[REDACTED]',
        MessageAction: createCommand.input.MessageAction
      }, null, 2));
    }

    const createResponse = await cognitoClient.send(createCommand);
    console.log('User created successfully:', JSON.stringify(createResponse, null, 2));

    // Note: We don't set permanent password here because:
    // 1. It can cause "User not found" errors due to timing
    // 2. Cognito handles temporary passwords automatically
    // 3. Users can set their own permanent password on first login

    if (process.env.STAGE === 'development') {
      console.log('DEBUG: User creation completed, skipping permanent password setting');
    }

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
          username: username, // Return the generated username
          email: email,
          status: createResponse.User?.UserStatus
        },
        note: 'User will need to set permanent password on first login'
      })
    };

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (process.env.STAGE === 'development') {
      console.log('DEBUG: Full error object:', JSON.stringify(error, null, 2));
      console.log('DEBUG: Error name:', error instanceof Error ? error.name : 'Unknown');
      console.log('DEBUG: Error message:', error instanceof Error ? error.message : 'Unknown');
      console.log('DEBUG: Error stack:', error instanceof Error ? error.stack : 'Unknown');
    }
    
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
        errorMessage = `Invalid parameters provided: ${error.message}`;
      } else if (error.name === 'UserNotFoundException') {
        statusCode = 404;
        errorMessage = 'User not found';
      } else if (error.name === 'NotAuthorizedException') {
        statusCode = 403;
        errorMessage = 'Not authorized to perform this action';
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
        error: errorMessage,
        debug: process.env.STAGE === 'development' ? {
          errorName: error instanceof Error ? error.name : 'Unknown',
          originalMessage: error instanceof Error ? error.message : 'Unknown'
        } : undefined
      })
    };
  }
}
