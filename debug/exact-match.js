#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({
  region: 'us-east-1'
});

const USER_POOL_ID = 'us-east-1_XCouXJ8pB';

async function testExactMatch() {
  console.log('🔍 Testing with EXACT same parameters as Lambda function...');
  
  try {
    const testEmail = 'exact-match-test@example.com';
    const testUsername = `exactmatch${Math.floor(Math.random() * 10000)}`;
    
    console.log('Test email:', testEmail);
    console.log('Test username:', testUsername);
    
    // Use EXACT same command as Lambda function
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'given_name', Value: 'Test' },           // Same as Lambda
        { Name: 'family_name', Value: 'User' },          // Same as Lambda
        { Name: 'email_verified', Value: 'true' }
      ],
      TemporaryPassword: 'Password123!',                 // Same as Lambda
      MessageAction: 'RESEND'                            // Same as Lambda (sendEmail: true)
    });

    console.log('Sending AdminCreateUserCommand with exact Lambda parameters...');
    const createResult = await client.send(createCommand);
    
    console.log('✅ User creation successful!');
    console.log('Created user:', createResult.User?.Username);
    console.log('User status:', createResult.User?.UserStatus);
    
  } catch (error) {
    console.log('❌ ERROR with exact Lambda parameters:');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('HTTP status:', error.$metadata?.httpStatusCode);
    console.log('Request ID:', error.$metadata?.requestId);
    
    if (error.name === 'UserNotFoundException') {
      console.log('🚨 SAME ERROR as Lambda function!');
      console.log('This confirms the issue is with the parameters or User Pool config');
    }
  }
}

testExactMatch().catch(console.error);
