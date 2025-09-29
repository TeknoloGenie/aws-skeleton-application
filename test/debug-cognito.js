#!/usr/bin/env node

/**
 * Manual debug script for Cognito user creation
 * Run this to test the actual Lambda function and see detailed error output
 */

const { handler } = require('../lib/lambda/dist/cognito-admin.js');

// Mock event that matches what the frontend sends
const mockEvent = {
  httpMethod: 'POST',
  path: '/api/admin/cognito/users',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'
  },
  body: JSON.stringify({
    email: 'test-debug@example.com',
    givenName: 'Debug',
    familyName: 'Test',
    temporaryPassword: 'TempPass123!',
    sendEmail: false
  }),
  requestContext: {
    authorizer: {
      claims: {
        'cognito:groups': ['admins'],
        'sub': 'test-user-id'
      }
    }
  },
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: '',
  isBase64Encoded: false,
  multiValueHeaders: {}
};

const mockContext = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'debug-test',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:debug-test',
  memoryLimitInMB: '128',
  awsRequestId: 'debug-request-id',
  logGroupName: '/aws/lambda/debug-test',
  logStreamName: 'debug-stream',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {}
};

async function runDebugTest() {
  console.log('🔍 Starting Cognito Debug Test...');
  console.log('📧 Test Email: test-debug@example.com');
  console.log('🏷️  Expected Username Pattern: testdebug[1000-9999]');
  console.log('');

  // Set environment variables
  process.env.USER_POOL_ID = 'us-east-1_XCouXJ8pB';
  process.env.STAGE = 'development';
  process.env.AWS_REGION = 'us-east-1';

  try {
    console.log('📤 Sending request to Lambda handler...');
    const result = await handler(mockEvent, mockContext);
    
    console.log('');
    console.log('✅ Lambda Response:');
    console.log('Status Code:', result.statusCode);
    console.log('Headers:', JSON.stringify(result.headers, null, 2));
    console.log('Body:', JSON.stringify(JSON.parse(result.body), null, 2));
    
    if (result.statusCode === 201) {
      console.log('');
      console.log('🎉 SUCCESS: User created successfully!');
      const responseBody = JSON.parse(result.body);
      console.log('👤 Generated Username:', responseBody.user.username);
      console.log('📧 Email:', responseBody.user.email);
      console.log('📊 Status:', responseBody.user.status);
    } else {
      console.log('');
      console.log('❌ FAILED: User creation failed');
      const responseBody = JSON.parse(result.body);
      console.log('🚨 Error:', responseBody.error);
      if (responseBody.debug) {
        console.log('🔍 Debug Info:', responseBody.debug);
      }
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 EXCEPTION: Unhandled error occurred');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);
    console.log('Stack Trace:', error.stack);
  }
}

// Run the debug test
runDebugTest().catch(console.error);
