#!/usr/bin/env node

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

async function createUserRecord(idToken) {
  console.log('👤 Attempting to create User record...');
  
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
    cognitoId: "e4588408-8001-7082-44d3-2c3e069bca99",
    email: "alrussell90@icloud.com",
    name: "Aaron Russell",
    role: "admin",
    bio: "Test admin user created by debug script"
  };

  console.log('Input data:');
  console.log(JSON.stringify(createUserInput, null, 2));

  const postData = JSON.stringify({
    query: createUserMutation,
    variables: { input: createUserInput }
  });

  const url = new URL(awsExports.aws_appsync_graphqlEndpoint);
  
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
          
          if (response.data && response.data.createUser) {
            console.log('✅ User created successfully!');
            console.log('📋 User record:');
            console.log(JSON.stringify(response.data.createUser, null, 2));
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
          console.error('❌ Error parsing response:', error.message);
          console.log('Raw response:', data);
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

// Get the ID token from the previous test
const idToken = process.argv[2];

if (!idToken) {
  console.log('Usage: node create-user-test.js <id-token>');
  console.log('Run the simple-auth-test.js first to get the ID token');
  process.exit(1);
}

createUserRecord(idToken);
