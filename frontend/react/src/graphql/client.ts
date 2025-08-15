import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { fetchAuthSession } from 'aws-amplify/auth';
import awsExports from '../aws-exports.js';

// HTTP link to GraphQL endpoint
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
        authorization: token ? `Bearer ${token}` : "",
        'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    };
  } catch (error) {
    console.log('No authenticated user:', error);
    return {
      headers: {
        ...headers,
        'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    };
  }
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
    
    // Handle authentication errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Redirect to login or refresh token
      console.log('Authentication error - redirecting to login');
    }
  }
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          listUsers: {
            merge(_, incoming) {
              return incoming;
            },
          },
          listPosts: {
            merge(_, incoming) {
              return incoming;
            },
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

export default apolloClient;
