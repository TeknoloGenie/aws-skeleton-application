#!/usr/bin/env node

/**
 * Simple Authorization Debug Test
 * 
 * This script tests authentication and JWT token analysis
 */

const jwt = require('jsonwebtoken');
const https = require('https');
const { URL } = require('url');

// Import AWS exports
let awsExports;
try {
  awsExports = require('./frontend/react/src/aws-exports.js');
  if (awsExports.default) {
    awsExports = awsExports.default;
  }
} catch (error) {
  console.error('❌ Could not load aws-exports.js:', error.message);
  process.exit(1);
}

class SimpleAuthTester {
  constructor() {
    this.userPoolId = awsExports.aws_user_pools_id;
    this.clientId = awsExports.aws_user_pools_web_client_id;
    this.region = awsExports.aws_cognito_region;
    this.graphqlEndpoint = awsExports.aws_appsync_graphqlEndpoint;
  }

  async authenticateWithCognito(email, password) {
    console.log('🔐 Authenticating with Cognito...');
    console.log(`User Pool ID: ${this.userPoolId}`);
    console.log(`Client ID: ${this.clientId}`);
    console.log(`Region: ${this.region}`);
    console.log(`Email: ${email}`);

    const authData = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(authData);
      
      const options = {
        hostname: `cognito-idp.${this.region}.amazonaws.com`,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.AuthenticationResult) {
              console.log('✅ Authentication successful');
              resolve(response.AuthenticationResult);
            } else {
              console.error('❌ Authentication failed:', response);
              reject(new Error(response.message || 'Authentication failed'));
            }
          } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  analyzeJWTToken(idToken) {
    console.log('\n🎫 Analyzing JWT token...');
    
    try {
      const decoded = jwt.decode(idToken);
      console.log('✅ JWT token decoded successfully');
      console.log('\n📋 Token payload:');
      console.log(JSON.stringify(decoded, null, 2));
      
      // Extract key information
      const userId = decoded.sub;
      const email = decoded.email;
      const groups = decoded['cognito:groups'] || [];
      const username = decoded['cognito:username'];
      
      console.log('\n🔍 Key Information:');
      console.log(`User ID (sub): ${userId}`);
      console.log(`Email: ${email}`);
      console.log(`Username: ${username}`);
      console.log(`Groups: ${groups.join(', ') || 'None'}`);
      console.log(`Token Type: ${decoded.token_use}`);
      console.log(`Issued At: ${new Date(decoded.iat * 1000).toISOString()}`);
      console.log(`Expires At: ${new Date(decoded.exp * 1000).toISOString()}`);
      
      return {
        userId,
        email,
        username,
        groups,
        fullToken: decoded
      };
    } catch (error) {
      console.error('❌ Error decoding JWT token:', error.message);
      return null;
    }
  }

  async testGraphQLQuery(idToken, query, variables = {}) {
    console.log('\n🚀 Testing GraphQL query...');
    console.log(`Endpoint: ${this.graphqlEndpoint}`);
    console.log(`Query: ${query.replace(/\s+/g, ' ').trim()}`);
    
    const postData = JSON.stringify({
      query: query,
      variables: variables
    });

    const url = new URL(this.graphqlEndpoint);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'x-debug': 'true',
        'x-user-timezone': 'UTC',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`📊 Response status: ${res.statusCode}`);
            
            if (response.data) {
              console.log('✅ GraphQL query successful');
              console.log('📋 Response data:');
              console.log(JSON.stringify(response.data, null, 2));
            }
            
            if (response.errors) {
              console.log('❌ GraphQL errors:');
              response.errors.forEach(error => {
                console.log(`  - ${error.message}`);
                if (error.locations) {
                  console.log(`    Location: ${JSON.stringify(error.locations)}`);
                }
                if (error.path) {
                  console.log(`    Path: ${error.path}`);
                }
              });
            }
            
            resolve(response);
          } catch (error) {
            console.error('❌ Error parsing GraphQL response:', error.message);
            console.log('Raw response:', data);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ GraphQL request error:', error.message);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async runTest(email, password) {
    try {
      console.log('🧪 Starting simple authorization test...\n');
      
      // Step 1: Authenticate
      const authResult = await this.authenticateWithCognito(email, password);
      const idToken = authResult.IdToken;
      
      // Step 2: Analyze JWT token
      const tokenInfo = this.analyzeJWTToken(idToken);
      
      if (!tokenInfo) {
        throw new Error('Failed to analyze JWT token');
      }
      
      // Step 3: Try to create a User record first
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            userId
            cognitoId
            email
            name
            role
            createdAt
            updatedAt
          }
        }
      `;
      
      const createUserInput = {
        cognitoId: tokenInfo.userId,
        email: tokenInfo.email,
        name: "Aaron Russell",
        role: "admin",
        bio: "Test admin user created by debug script"
      };
      
      console.log('\n👤 Attempting to create User record...');
      await this.testGraphQLQuery(idToken, createUserMutation, { input: createUserInput });
      
      // Step 4: Test listUsers query to see if user was created
      const listUsersQuery = `
        query ListUsers {
          listUsers {
            id
            userId
            cognitoId
            email
            name
            role
            createdAt
            updatedAt
          }
        }
      `;
      
      console.log('\n👥 Testing listUsers query...');
      await this.testGraphQLQuery(idToken, listUsersQuery);
      
      // Step 5: Test listPosts query
      const listPostsQuery = `
        query ListPosts {
          listPosts {
            id
            title
            content
            userId
            published
            createdAt
            updatedAt
          }
        }
      `;
      
      console.log('\n📝 Testing listPosts query...');
      await this.testGraphQLQuery(idToken, listPostsQuery);
      
      // Step 6: Try to create a post
      const createPostMutation = `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
            title
            content
            userId
            published
            createdAt
            updatedAt
          }
        }
      `;
      
      const createPostInput = {
        title: `Test Post ${Date.now()}`,
        content: "This is a test post created by the debug script",
        published: true
      };
      
      console.log('\n✏️ Attempting to create a Post...');
      await this.testGraphQLQuery(idToken, createPostMutation, { input: createPostInput });
      
      console.log('\n📊 Test completed!');
      
    } catch (error) {
      console.error('💥 Test failed:', error.message);
    }
  }
}

// Main execution
async function main() {
  const tester = new SimpleAuthTester();
  
  const email = process.argv[2] || process.env.TEST_EMAIL;
  const password = process.argv[3] || process.env.TEST_PASSWORD;
  
  if (!email || !password) {
    console.log('Usage: node simple-auth-test.js <email> <password>');
    console.log('Or set TEST_EMAIL and TEST_PASSWORD environment variables');
    process.exit(1);
  }
  
  await tester.runTest(email, password);
}

if (require.main === module) {
  main();
}
