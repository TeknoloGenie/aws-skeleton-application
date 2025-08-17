#!/usr/bin/env node

/**
 * Authorization Debug Test Script
 * 
 * This script will help debug the authorization issues by:
 * 1. Authenticating with your credentials
 * 2. Inspecting the JWT token
 * 3. Testing GraphQL operations
 * 4. Checking user provisioning
 * 5. Analyzing access control logic
 */

const { Amplify, Auth } = require('aws-amplify');
const { ApolloClient, InMemoryCache, createHttpLink, gql } = require('@apollo/client');
const { setContext } = require('@apollo/client/link/context');
const jwt = require('jsonwebtoken');

// Import AWS exports
const awsExports = require('./frontend/react/src/aws-exports.js');

// Configure Amplify
Amplify.configure(awsExports.default || awsExports);

// GraphQL queries for testing
const LIST_POSTS_QUERY = gql`
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

const GET_USER_BY_COGNITO_ID = gql`
  query GetUserByCognitoId($cognitoId: String!) {
    listUsers(filter: { cognitoId: { eq: $cognitoId } }) {
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

const CREATE_USER_MUTATION = gql`
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

const CREATE_POST_MUTATION = gql`
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

class AuthDebugger {
  constructor() {
    this.apolloClient = null;
    this.currentUser = null;
    this.jwtToken = null;
    this.decodedToken = null;
  }

  async authenticate(email, password) {
    try {
      console.log('🔐 Authenticating with Cognito...');
      console.log(`Email: ${email}`);
      
      const user = await Auth.signIn(email, password);
      this.currentUser = user;
      
      console.log('✅ Authentication successful');
      console.log(`User ID: ${user.attributes.sub}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.attributes.email}`);
      
      return user;
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async getJWTToken() {
    try {
      console.log('\n🎫 Getting JWT token...');
      
      const session = await Auth.currentSession();
      this.jwtToken = session.getIdToken().getJwtToken();
      this.decodedToken = jwt.decode(this.jwtToken);
      
      console.log('✅ JWT token retrieved');
      console.log('Token payload:');
      console.log(JSON.stringify(this.decodedToken, null, 2));
      
      // Check for groups
      const groups = this.decodedToken['cognito:groups'] || [];
      console.log(`\n👥 User groups: ${groups.join(', ') || 'None'}`);
      
      return this.jwtToken;
    } catch (error) {
      console.error('❌ Failed to get JWT token:', error.message);
      throw error;
    }
  }

  createApolloClient() {
    console.log('\n🚀 Creating Apollo client...');
    
    const httpLink = createHttpLink({
      uri: awsExports.default?.aws_appsync_graphqlEndpoint || awsExports.aws_appsync_graphqlEndpoint,
    });

    const authLink = setContext(async (_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: this.jwtToken ? `Bearer ${this.jwtToken}` : "",
          'x-debug': 'true', // Enable debug logging
          'x-user-timezone': 'UTC',
        }
      };
    });

    this.apolloClient = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: { errorPolicy: 'all' },
        query: { errorPolicy: 'all' },
        mutate: { errorPolicy: 'all' },
      },
    });

    console.log('✅ Apollo client created');
  }

  async checkUserProvisioning() {
    try {
      console.log('\n👤 Checking user provisioning...');
      
      const cognitoId = this.decodedToken.sub;
      console.log(`Looking for user with cognitoId: ${cognitoId}`);
      
      const result = await this.apolloClient.query({
        query: GET_USER_BY_COGNITO_ID,
        variables: { cognitoId },
        fetchPolicy: 'network-only'
      });

      if (result.data?.listUsers?.length > 0) {
        const userRecord = result.data.listUsers[0];
        console.log('✅ User record found:');
        console.log(JSON.stringify(userRecord, null, 2));
        return userRecord;
      } else {
        console.log('⚠️  No user record found - attempting to create one...');
        return await this.createUserRecord();
      }
    } catch (error) {
      console.error('❌ Error checking user provisioning:', error.message);
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach(err => {
          console.error(`GraphQL Error: ${err.message}`);
        });
      }
      return null;
    }
  }

  async createUserRecord() {
    try {
      const email = this.decodedToken.email;
      const givenName = this.decodedToken.given_name || '';
      const familyName = this.decodedToken.family_name || '';
      const name = `${givenName} ${familyName}`.trim() || email.split('@')[0];
      
      // Determine role
      let role = 'user';
      if (email.includes('admin') || email === 'aaron.russell@example.com') {
        role = 'admin';
      }

      const createUserInput = {
        cognitoId: this.decodedToken.sub,
        email: email,
        name: name,
        role: role,
        bio: `Auto-provisioned user for ${email}`
      };

      console.log('Creating user with input:');
      console.log(JSON.stringify(createUserInput, null, 2));

      const result = await this.apolloClient.mutate({
        mutation: CREATE_USER_MUTATION,
        variables: { input: createUserInput }
      });

      if (result.data?.createUser) {
        console.log('✅ User record created successfully:');
        console.log(JSON.stringify(result.data.createUser, null, 2));
        return result.data.createUser;
      } else {
        console.log('❌ Failed to create user record');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating user record:', error.message);
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach(err => {
          console.error(`GraphQL Error: ${err.message}`);
        });
      }
      return null;
    }
  }

  async testListPosts() {
    try {
      console.log('\n📝 Testing listPosts query...');
      
      const result = await this.apolloClient.query({
        query: LIST_POSTS_QUERY,
        fetchPolicy: 'network-only'
      });

      if (result.data?.listPosts) {
        console.log(`✅ listPosts successful - found ${result.data.listPosts.length} posts`);
        result.data.listPosts.forEach((post, index) => {
          console.log(`Post ${index + 1}: ${post.title} (by ${post.userId})`);
        });
        return result.data.listPosts;
      } else {
        console.log('⚠️  listPosts returned no data');
        return [];
      }
    } catch (error) {
      console.error('❌ listPosts failed:', error.message);
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach(err => {
          console.error(`GraphQL Error: ${err.message}`);
          console.error(`Location: ${JSON.stringify(err.locations)}`);
          console.error(`Path: ${err.path}`);
        });
      }
      if (error.networkError) {
        console.error('Network Error:', error.networkError.message);
      }
      return null;
    }
  }

  async testCreatePost() {
    try {
      console.log('\n✏️  Testing createPost mutation...');
      
      const createPostInput = {
        title: `Test Post ${Date.now()}`,
        content: 'This is a test post created by the debug script',
        published: true
      };

      console.log('Creating post with input:');
      console.log(JSON.stringify(createPostInput, null, 2));

      const result = await this.apolloClient.mutate({
        mutation: CREATE_POST_MUTATION,
        variables: { input: createPostInput }
      });

      if (result.data?.createPost) {
        console.log('✅ createPost successful:');
        console.log(JSON.stringify(result.data.createPost, null, 2));
        return result.data.createPost;
      } else {
        console.log('❌ createPost failed - no data returned');
        return null;
      }
    } catch (error) {
      console.error('❌ createPost failed:', error.message);
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach(err => {
          console.error(`GraphQL Error: ${err.message}`);
          console.error(`Location: ${JSON.stringify(err.locations)}`);
          console.error(`Path: ${err.path}`);
        });
      }
      return null;
    }
  }

  async runFullTest(email, password) {
    try {
      console.log('🧪 Starting comprehensive authorization debug test...\n');
      
      // Step 1: Authenticate
      await this.authenticate(email, password);
      
      // Step 2: Get JWT token and analyze it
      await this.getJWTToken();
      
      // Step 3: Create Apollo client
      this.createApolloClient();
      
      // Step 4: Check user provisioning
      const userRecord = await this.checkUserProvisioning();
      
      // Step 5: Test listPosts
      const posts = await this.testListPosts();
      
      // Step 6: Test createPost
      const newPost = await this.testCreatePost();
      
      // Step 7: Test listPosts again to see if the new post appears
      if (newPost) {
        console.log('\n🔄 Testing listPosts again after creating post...');
        await this.testListPosts();
      }
      
      console.log('\n📊 Test Summary:');
      console.log(`Authentication: ✅`);
      console.log(`JWT Token: ✅`);
      console.log(`User Groups: ${this.decodedToken['cognito:groups']?.join(', ') || 'None'}`);
      console.log(`User Record: ${userRecord ? '✅' : '❌'}`);
      console.log(`User Role: ${userRecord?.role || 'Unknown'}`);
      console.log(`List Posts: ${posts !== null ? '✅' : '❌'}`);
      console.log(`Create Post: ${newPost ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('💥 Test failed with error:', error.message);
    } finally {
      // Sign out
      try {
        await Auth.signOut();
        console.log('\n👋 Signed out successfully');
      } catch (error) {
        console.error('Error signing out:', error.message);
      }
    }
  }
}

// Main execution
async function main() {
  const authDebugger = new AuthDebugger();
  
  // Get credentials from command line arguments or environment variables
  const email = process.argv[2] || process.env.TEST_EMAIL;
  const password = process.argv[3] || process.env.TEST_PASSWORD;
  
  if (!email || !password) {
    console.log('Usage: node test-auth-debug.js <email> <password>');
    console.log('Or set TEST_EMAIL and TEST_PASSWORD environment variables');
    process.exit(1);
  }
  
  await authDebugger.runFullTest(email, password);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = AuthDebugger;
