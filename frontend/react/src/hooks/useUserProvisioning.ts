import { gql } from '@apollo/client';
import { useEffect, useState } from 'react';
import { apolloClient } from '../graphql/client';

interface CognitoUser {
  userId: string;
  username?: string;
  signInDetails?: {
    loginId?: string;
  };
  attributes?: {
    email?: string;
    given_name?: string;
    family_name?: string;
  };
}

interface UserProvisioningResult {
  isProvisioned: boolean;
  isLoading: boolean;
  error: string | null;
  userRecord: { id: string; email?: string; name?: string; cognitoId?: string } | null;
}

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

const CREATE_USER = gql`
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

export function useUserProvisioning(cognitoUser: CognitoUser): UserProvisioningResult {
  const [isProvisioned, setIsProvisioned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRecord, setUserRecord] = useState<{ id: string; email?: string; name?: string; cognitoId?: string } | null>(null);

  useEffect(() => {
    if (!cognitoUser?.userId) {
      setIsLoading(false);
      return;
    }

    const provisionUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (process.env.NODE_ENV === 'development') {
          console.log('Checking user provisioning for:', cognitoUser.userId);
        }

        // First, check if user already exists
        const existingUserResult = await apolloClient.query({
          query: GET_USER_BY_COGNITO_ID,
          variables: { cognitoId: cognitoUser.userId },
          fetchPolicy: 'network-only', // Always check the server
          errorPolicy: 'all'
        });

        if (existingUserResult.data?.listUsers?.length > 0) {
          // User already exists
          const existingUser = existingUserResult.data.listUsers[0];
          setUserRecord(existingUser);
          setIsProvisioned(true);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('User already provisioned:', existingUser);
          }
          return;
        }

        // User doesn't exist, create new user record
        const email = cognitoUser.signInDetails?.loginId || 
                     cognitoUser.attributes?.email || 
                     `${cognitoUser.userId}@example.com`;
        
        const givenName = cognitoUser.attributes?.given_name || '';
        const familyName = cognitoUser.attributes?.family_name || '';
        const name = `${givenName} ${familyName}`.trim() || 
                    cognitoUser.username || 
                    email.split('@')[0];

        // Determine role based on email or default to user
        let role = 'user';
        if (email.includes('admin') || email === 'alrussell90@icloud.com') {
          role = 'admin';
        }

        const createUserInput = {
          cognitoId: cognitoUser.userId,
          email: email,
          name: name,
          role: role,
          bio: `Auto-provisioned user for ${email}`
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('Creating new user record:', createUserInput);
        }

        const createResult = await apolloClient.mutate({
          mutation: CREATE_USER,
          variables: { input: createUserInput },
          errorPolicy: 'all'
        });

        if (createResult.data?.createUser) {
          setUserRecord(createResult.data.createUser);
          setIsProvisioned(true);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('User successfully provisioned:', createResult.data.createUser);
          }
        } else {
          throw new Error('Failed to create user record');
        }

      } catch (err: unknown) {
        const error = err as Error;
        console.error('User provisioning error:', error);
        setError(error.message || 'Failed to provision user');
        
        // If it's an authorization error, the user might still be able to use the app
        // with just Cognito groups, so don't block them
        if (error.message?.includes('Not Authorized')) {
          setError('User auto-provisioning failed due to permissions, but you can still use the app');
        }
      } finally {
        setIsLoading(false);
      }
    };

    provisionUser();
  }, [
    cognitoUser?.userId,
    cognitoUser?.attributes?.email,
    cognitoUser?.attributes?.given_name,
    cognitoUser?.attributes?.family_name,
    cognitoUser?.signInDetails?.loginId,
    cognitoUser?.username
  ]);

  return {
    isProvisioned,
    isLoading,
    error,
    userRecord
  };
}
