#!/usr/bin/env node

/**
 * Minimal Cognito test to isolate the exact issue
 * This bypasses all our complex logic and tests core Cognito operations
 */

const { CognitoIdentityProviderClient, AdminCreateUserCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({
  region: 'us-east-1'
});

const USER_POOL_ID = 'us-east-1_XCouXJ8pB';

async function testCognitoOperations() {
  console.log('🔍 Testing Cognito Operations...');
  console.log('User Pool ID:', USER_POOL_ID);
  console.log('');

  try {
    // Test 1: List existing users (should work)
    console.log('📋 Test 1: Listing existing users...');
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 5
    });
    
    const listResult = await client.send(listCommand);
    console.log('✅ List users successful');
    console.log('Existing users:', listResult.Users?.length || 0);
    listResult.Users?.forEach(user => {
      console.log(`  - ${user.Username} (${user.Attributes?.find(a => a.Name === 'email')?.Value})`);
    });
    console.log('');

    // Test 2: Try to create a user with minimal parameters
    console.log('👤 Test 2: Creating user with minimal parameters...');
    const testEmail = `minimal-test-${Date.now()}@example.com`;
    const testUsername = `minimaltest${Math.floor(Math.random() * 10000)}`;
    
    console.log('Test email:', testEmail);
    console.log('Test username:', testUsername);
    
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: testUsername,
      UserAttributes: [
        { Name: 'email', Value: testEmail },
        { Name: 'email_verified', Value: 'true' }
      ],
      TemporaryPassword: 'TempPass123!',
      MessageAction: 'SUPPRESS'
    });

    console.log('Sending AdminCreateUserCommand...');
    const createResult = await client.send(createCommand);
    
    console.log('✅ User creation successful!');
    console.log('Created user:', createResult.User?.Username);
    console.log('User status:', createResult.User?.UserStatus);
    
  } catch (error) {
    console.log('');
    console.log('❌ ERROR OCCURRED:');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('HTTP status:', error.$metadata?.httpStatusCode);
    console.log('Request ID:', error.$metadata?.requestId);
    console.log('');
    console.log('Full error object:');
    console.log(JSON.stringify(error, null, 2));
    
    // Additional debugging
    if (error.name === 'UserNotFoundException') {
      console.log('');
      console.log('🔍 UserNotFoundException Analysis:');
      console.log('This error during CREATE operation suggests:');
      console.log('1. User Pool ID might be incorrect');
      console.log('2. Permissions issue (but we can list users)');
      console.log('3. User Pool configuration issue');
      console.log('4. AWS service issue');
    }
  }
}

// Run the test
testCognitoOperations().catch(console.error);
