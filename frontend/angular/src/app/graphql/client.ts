import { Injectable } from '@angular/core';
import { fetchAuthSession, getCurrentUser as amplifyGetCurrentUser, signOut as amplifySignOut } from '@aws-amplify/auth';

@Injectable({
  providedIn: 'root'
})
export class GraphQLClientService {
  private endpoint: string = '';

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    // Import AWS configuration
    let awsExports: any;
    try {
      awsExports = (await import('../../aws-exports.js')).default;
      this.endpoint = awsExports.API?.GraphQL?.endpoint || awsExports.aws_appsync_graphqlEndpoint || '';
    } catch (error) {
      console.warn('AWS exports not found, using fallback configuration');
      this.endpoint = 'https://localhost:3000/graphql';
    }
  }

  // Simple GraphQL query method
  async query(query: string, variables?: any) {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        // Handle authentication errors
        if (result.errors.some((error: any) => 
          error.message.includes('Unauthorized') || error.message.includes('Authentication')
        )) {
          console.log('Authentication error detected, signing out...');
          await this.signOut();
        }
      }

      return result;
    } catch (error) {
      console.error('GraphQL request failed:', error);
      throw error;
    }
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
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}
