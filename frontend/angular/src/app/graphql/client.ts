import { Injectable } from '@angular/core';
import { fetchAuthSession, getCurrentUser as amplifyGetCurrentUser, signOut as amplifySignOut } from '@aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class GraphQLClientService {
  private endpoint = '';
  private initialized = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      // Import AWS configuration
      const awsExports = (await import('../../aws-exports.js')).default;
      this.endpoint = awsExports.aws_appsync_graphqlEndpoint || '';
      
      if (!this.endpoint) {
        console.error('No GraphQL endpoint found in aws-exports');
        throw new Error('GraphQL endpoint not configured');
      }
      
      this.initialized = true;
      console.log('GraphQL client initialized with endpoint:', this.endpoint);
    } catch (error) {
      console.error('Failed to initialize GraphQL client:', error);
      // Fallback for development
      this.endpoint = 'http://localhost:3000/graphql';
      this.initialized = true;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeClient();
    }
  }

  // GraphQL query method compatible with AWS AppSync
  async query(query: string, variables?: Record<string, any>) {
    console.log('=== GRAPHQL CLIENT QUERY ===');
    await this.ensureInitialized();
    
    try {
      console.log('1. Getting auth session...');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        console.error('2. No authentication token available');
        throw new Error('No authentication token available');
      }
      
      console.log('2. Token available:', token.substring(0, 50) + '...');
      console.log('3. Endpoint:', this.endpoint);
      console.log('4. Query:', query.substring(0, 200) + '...');
      console.log('5. Variables:', variables);

      const requestBody = {
        query,
        variables: variables || {}
      };
      
      console.log('6. Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify(requestBody)
      });

      console.log('7. Response status:', response.status, response.statusText);
      console.log('8. Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('9. HTTP error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Body: ${errorText}`);
      }

      const result = await response.json();
      
      console.log('9. GraphQL response:', JSON.stringify(result, null, 2));

      if (result.errors && result.errors.length > 0) {
        console.error('10. GraphQL errors found:', result.errors);
        
        // Handle authentication errors
        const hasAuthError = result.errors.some((error: any) => 
          error.message?.includes('Unauthorized') || 
          error.message?.includes('Authentication') ||
          error.message?.includes('Access denied')
        );
        
        if (hasAuthError) {
          console.log('11. Authentication error detected, signing out...');
          await this.signOut();
          throw new Error('Authentication failed. Please sign in again.');
        }
        
        // Throw the first error
        const errorMessage = result.errors[0].message || 'GraphQL query failed';
        console.error('11. Throwing GraphQL error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('10. Query successful, returning result');
      console.log('=== END GRAPHQL CLIENT QUERY ===');
      return result;
    } catch (error) {
      console.error('=== GRAPHQL CLIENT ERROR ===');
      console.error('Error details:', error);
      console.error('=== END GRAPHQL CLIENT ERROR ===');
      throw error;
    }
  }

  // Mutation method (alias for query since GraphQL treats them the same)
  async mutate(mutation: string, variables?: Record<string, any>) {
    return this.query(mutation, variables);
  }

  // Helper method to get current user
  async getCurrentUser() {
    try {
      return await amplifyGetCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  // Helper method to sign out
  async signOut() {
    try {
      await amplifySignOut();
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}
