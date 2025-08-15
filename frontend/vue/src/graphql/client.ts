import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { fetchAuthSession, getCurrentUser as amplifyGetCurrentUser, signOut as amplifySignOut } from '@aws-amplify/auth';

// Import AWS configuration
let awsExports: any;
try {
  awsExports = (await import('../aws-exports.js')).default;
} catch (error) {
  console.warn('AWS exports not found, using fallback configuration');
  awsExports = {
    aws_appsync_graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'https://localhost:3000/graphql',
    aws_appsync_region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  };
}

// HTTP link for GraphQL endpoint
const httpLink = createHttpLink({
  uri: awsExports.aws_appsync_graphqlEndpoint,
});

// Authentication link
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get the current user session using Amplify v6 API
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
        'x-api-key': awsExports.aws_appsync_apiKey || '',
        'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  } catch (error) {
    console.warn('No authenticated user found');
    return {
      headers: {
        ...headers,
        'x-api-key': awsExports.aws_appsync_apiKey || '',
        'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  }
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
    
    // Handle authentication errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Redirect to login or refresh token
      console.warn('Authentication error, redirecting to login');
      window.location.href = '/login';
    }
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Configure caching policies for your types
      User: {
        fields: {
          posts: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
      Post: {
        fields: {
          user: {
            merge: true,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// Subscription client for real-time updates
export const createSubscriptionClient = () => {
  if (!awsExports.aws_appsync_realTimeEndpoint) {
    console.warn('Real-time endpoint not configured');
    return null;
  }

  // This would be implemented with AppSync's real-time subscriptions
  // For now, we'll return a placeholder
  return {
    subscribe: (query: any, variables: any) => {
      console.log('Subscription not yet implemented:', query, variables);
      return {
        unsubscribe: () => {},
      };
    },
  };
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens?.accessToken;
  } catch {
    return false;
  }
};

// Helper function to get current user info
export const getCurrentUser = async () => {
  try {
    const user = await amplifyGetCurrentUser();
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    
    return {
      id: user.userId,
      email: user.signInDetails?.loginId || '',
      name: user.username,
      groups: idToken?.payload['cognito:groups'] || [],
    };
  } catch (error) {
    throw new Error('No authenticated user found');
  }
};

// Helper function to sign out
export const signOut = async () => {
  try {
    await amplifySignOut();
    // Clear Apollo cache
    await apolloClient.clearStore();
    window.location.href = '/login';
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
