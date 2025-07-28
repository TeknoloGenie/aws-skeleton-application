# Cognito Admin API Implementation

## 🔧 **Backend Lambda Function**

Create a Lambda function to list Cognito users with admin permissions:

### **Lambda Function Code**

```typescript
// lib/lambda/cognito-admin.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Verify the user has admin permissions
    const userGroups = event.requestContext.authorizer?.claims['cognito:groups'];
    if (!userGroups || !userGroups.includes('admins')) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Insufficient permissions' })
      };
    }

    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('USER_POOL_ID environment variable not set');
    }

    // List users from Cognito User Pool
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Limit: 60, // Adjust as needed
      AttributesToGet: ['email', 'given_name', 'family_name', 'email_verified']
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to list users',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
```

### **CDK Stack Integration**

Add this to your CDK stack:

```typescript
// lib/app-stack.ts
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { RestApi, LambdaIntegration, CognitoUserPoolsAuthorizer } from 'aws-cdk-lib/aws-apigateway';

// Create the Lambda function
const cognitoAdminFunction = new Function(this, 'CognitoAdminFunction', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'cognito-admin.handler',
  code: Code.fromAsset('lib/lambda'),
  environment: {
    USER_POOL_ID: userPool.userPoolId,
    AWS_REGION: this.region
  }
});

// Grant permissions to list users
userPool.grant(cognitoAdminFunction, 'cognito-idp:ListUsers');

// Create API Gateway endpoint
const api = new RestApi(this, 'AdminApi', {
  restApiName: 'Admin API',
  description: 'API for admin operations'
});

const authorizer = new CognitoUserPoolsAuthorizer(this, 'AdminAuthorizer', {
  cognitoUserPools: [userPool]
});

const adminResource = api.root.addResource('admin');
const cognitoResource = adminResource.addResource('cognito');
const usersResource = cognitoResource.addResource('users');

usersResource.addMethod('GET', new LambdaIntegration(cognitoAdminFunction), {
  authorizer,
  authorizationType: AuthorizationType.COGNITO
});
```

## 🔐 **Required Permissions**

### **1. Lambda Execution Role**
The Lambda function needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminGetUser"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    }
  ]
}
```

### **2. User Group Requirements**
Users must be in the `admins` group to access this endpoint:

```bash
# Add user to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username john@example.com \
  --group-name admins
```

## 🚀 **GraphQL Mutations**

Update your GraphQL mutations to handle User records:

### **Create User Mutation**
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
    bio
    role
    cognitoId
    createdAt
    updatedAt
  }
}
```

### **Update User Mutation**
```graphql
mutation UpdateUser($input: UpdateUserInput!) {
  updateUser(input: $input) {
    id
    name
    email
    bio
    role
    cognitoId
    createdAt
    updatedAt
  }
}
```

### **List Users Query**
```graphql
query ListUsers($limit: Int) {
  listUsers(limit: $limit) {
    id
    name
    email
    bio
    role
    cognitoId
    createdAt
    updatedAt
  }
}
```

## 🔄 **Frontend Integration Steps**

### **1. Update GraphQL Queries**
Make sure your GraphQL queries file includes the mutations:

```typescript
// graphql/queries.ts (or mutations.ts)
export const CREATE_USER = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER = `
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
      updatedAt
    }
  }
`;

export const LIST_USERS = `
  query ListUsers($limit: Int) {
    listUsers(limit: $limit) {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
      updatedAt
    }
  }
`;
```

### **2. Environment Configuration**
Update your frontend environment to point to the correct API endpoint:

```typescript
// For development, you might use:
const API_BASE_URL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';

// The endpoint will be:
// GET /api/admin/cognito/users
```

### **3. Error Handling**
The implementations include proper error handling for:
- **Authentication failures** - No token or invalid token
- **Authorization failures** - User not in admin group
- **Network errors** - API unavailable
- **GraphQL errors** - Mutation/query failures

## 🎯 **Testing**

### **1. Test Cognito User Listing**
```bash
# Test the API endpoint directly
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/admin/cognito/users
```

### **2. Test GraphQL Operations**
```bash
# Test creating a user record
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "mutation { createUser(input: { name: \"Test User\", email: \"test@example.com\", cognitoId: \"user-123\" }) { id name email } }"}' \
  https://your-graphql-endpoint.appsync-api.us-east-1.amazonaws.com/graphql
```

This implementation provides a complete solution for managing both Cognito users and your application's User records with proper authentication, authorization, and error handling! 🚀
