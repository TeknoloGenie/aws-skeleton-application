import { handler } from '../lib/lambda/cognito-admin';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = jest.fn();
  const mockCognitoClient = jest.fn(() => ({
    send: mockSend
  }));

  return {
    CognitoIdentityProviderClient: mockCognitoClient,
    ListUsersCommand: jest.fn(),
    AdminCreateUserCommand: jest.fn(),
    AdminGetUserCommand: jest.fn(),
    AdminSetUserPasswordCommand: jest.fn(),
    MessageActionType: {
      RESEND: 'RESEND',
      SUPPRESS: 'SUPPRESS'
    },
    __mockSend: mockSend
  };
});

describe('Cognito Admin Lambda Function', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const { __mockSend } = require('@aws-sdk/client-cognito-identity-provider');
    mockSend = __mockSend;
    
    // Set environment variables
    process.env.USER_POOL_ID = 'us-east-1_XCouXJ8pB';
    process.env.STAGE = 'development';
    process.env.AWS_REGION = 'us-east-1';
  });

  afterEach(() => {
    delete process.env.USER_POOL_ID;
    delete process.env.STAGE;
    delete process.env.AWS_REGION;
  });

  describe('POST /cognito/users - Create User', () => {
    const createMockEvent = (body: any, claims: any = {}): APIGatewayProxyEvent => ({
      httpMethod: 'POST',
      path: '/api/admin/cognito/users',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify(body),
      requestContext: {
        authorizer: {
          claims: {
            'cognito:groups': ['admins'],
            ...claims
          }
        }
      } as any,
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: '',
      isBase64Encoded: false,
      multiValueHeaders: {}
    });

    it('should successfully create a user with valid parameters', async () => {
      // Mock successful Cognito responses
      mockSend.mockResolvedValueOnce({
        User: {
          Username: 'nodedad1234',
          UserStatus: 'FORCE_CHANGE_PASSWORD',
          Attributes: [
            { Name: 'email', Value: 'nodedad@nodegeeks.org' },
            { Name: 'given_name', Value: 'Node' },
            { Name: 'family_name', Value: 'Dad' }
          ]
        }
      });

      const event = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('User created successfully');
      expect(responseBody.user.email).toBe('nodedad@nodegeeks.org');
      expect(responseBody.user.username).toMatch(/^nodedad\d{4}$/);
      
      // Verify AdminCreateUserCommand was called with correct parameters
      expect(mockSend).toHaveBeenCalledTimes(1);
      
      const createUserCall = mockSend.mock.calls[0][0];
      expect(createUserCall.input.UserPoolId).toBe('us-east-1_XCouXJ8pB');
      expect(createUserCall.input.Username).toMatch(/^nodedad\d{4}$/);
      expect(createUserCall.input.UserAttributes).toEqual([
        { Name: 'email', Value: 'nodedad@nodegeeks.org' },
        { Name: 'given_name', Value: 'Node' },
        { Name: 'family_name', Value: 'Dad' },
        { Name: 'email_verified', Value: 'true' }
      ]);
    });

    it('should handle missing required fields', async () => {
      const event = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        // Missing givenName, familyName, temporaryPassword
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Missing required fields: email, givenName, familyName, temporaryPassword');
      expect(responseBody.received).toEqual({
        email: true,
        givenName: false,
        familyName: false,
        temporaryPassword: false
      });
    });

    it('should handle Cognito UserNotFoundException', async () => {
      // Mock Cognito throwing UserNotFoundException
      const cognitoError = new Error('User does not exist');
      cognitoError.name = 'UserNotFoundException';
      mockSend.mockRejectedValueOnce(cognitoError);

      const event = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User not found');
      expect(responseBody.debug.errorName).toBe('UserNotFoundException');
    });

    it('should handle Cognito InvalidParameterException', async () => {
      // Mock Cognito throwing InvalidParameterException
      const cognitoError = new Error('Invalid parameter: Username cannot be of email format');
      cognitoError.name = 'InvalidParameterException';
      mockSend.mockRejectedValueOnce(cognitoError);

      const event = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Invalid parameters provided: Invalid parameter: Username cannot be of email format');
      expect(responseBody.debug.errorName).toBe('InvalidParameterException');
    });

    it('should handle UsernameExistsException', async () => {
      // Mock Cognito throwing UsernameExistsException
      const cognitoError = new Error('An account with the given username already exists');
      cognitoError.name = 'UsernameExistsException';
      mockSend.mockRejectedValueOnce(cognitoError);

      const event = createMockEvent({
        email: 'existing@nodegeeks.org',
        givenName: 'Existing',
        familyName: 'User',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User with this email already exists');
      expect(responseBody.debug.errorName).toBe('UsernameExistsException');
    });

    it('should handle unauthorized access (non-admin user)', async () => {
      const event = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      }, {
        'cognito:groups': ['users'] // Not admin
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Insufficient permissions - admin access required');
      expect(responseBody.userGroups).toEqual(['users']);
    });

    it('should generate unique usernames for same email prefix', async () => {
      // Mock successful responses for multiple calls
      mockSend
        .mockResolvedValueOnce({
          User: { Username: 'nodedad1234', UserStatus: 'FORCE_CHANGE_PASSWORD' }
        })
        .mockResolvedValueOnce({
          User: { Username: 'nodedad5678', UserStatus: 'FORCE_CHANGE_PASSWORD' }
        });

      const event1 = createMockEvent({
        email: 'nodedad@nodegeeks.org',
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const event2 = createMockEvent({
        email: 'nodedad@example.com', // Same prefix, different domain
        givenName: 'Node',
        familyName: 'Dad',
        temporaryPassword: 'TempPass123!',
        sendEmail: true
      });

      const result1 = await handler(event1);
      const result2 = await handler(event2);

      expect(result1.statusCode).toBe(201);
      expect(result2.statusCode).toBe(201);

      const body1 = JSON.parse(result1.body);
      const body2 = JSON.parse(result2.body);

      // Both should have nodedad prefix but different numbers
      expect(body1.user.username).toMatch(/^nodedad\d{4}$/);
      expect(body2.user.username).toMatch(/^nodedad\d{4}$/);
      expect(body1.user.username).not.toBe(body2.user.username);
    });
  });

  describe('GET /cognito/users - List Users', () => {
    it('should successfully list users', async () => {
      mockSend.mockResolvedValueOnce({
        Users: [
          {
            Username: 'nodedad1234',
            UserStatus: 'CONFIRMED',
            Attributes: [
              { Name: 'email', Value: 'nodedad@nodegeeks.org' },
              { Name: 'given_name', Value: 'Node' },
              { Name: 'family_name', Value: 'Dad' }
            ]
          }
        ]
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/api/admin/cognito/users',
        headers: {},
        body: null,
        requestContext: {
          authorizer: {
            claims: {
              'cognito:groups': ['admins']
            }
          }
        } as any,
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        resource: '',
        isBase64Encoded: false,
        multiValueHeaders: {}
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.users).toHaveLength(1);
      expect(responseBody.users[0].Username).toBe('nodedad1234');
    });
  });
});

// Integration test that can be run against actual AWS resources
describe('Cognito Admin Integration Test', () => {
  // This test should be run manually against actual AWS resources
  // when debugging real issues
  it.skip('should create user in actual Cognito User Pool', async () => {
    // Set real environment variables
    process.env.USER_POOL_ID = 'us-east-1_XCouXJ8pB';
    process.env.STAGE = 'development';
    process.env.AWS_REGION = 'us-east-1';

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/api/admin/cognito/users',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test-user@example.com',
        givenName: 'Test',
        familyName: 'User',
        temporaryPassword: 'TempPass123!',
        sendEmail: false
      }),
      requestContext: {
        authorizer: {
          claims: {
            'cognito:groups': ['admins']
          }
        }
      } as any,
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      resource: '',
      isBase64Encoded: false,
      multiValueHeaders: {}
    };

    const result = await handler(event);
    
    console.log('Integration test result:', JSON.stringify(result, null, 2));
    
    // This will help us see the actual error in a controlled environment
    expect(result.statusCode).toBe(201);
  });
});
