import { gql } from '@apollo/client/core';
import { ref, watch, type Ref } from 'vue';
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
  isProvisioned: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  userRecord: Ref<any | null>;
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

export function useUserProvisioning(cognitoUser: Ref<CognitoUser | null>): UserProvisioningResult {
  const isProvisioned = ref(false);
  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const userRecord = ref<any | null>(null);

  const provisionUser = async (user: CognitoUser) => {
    try {
      isLoading.value = true;
      error.value = null;

      if (process.env.NODE_ENV === 'development') {
        console.log('Checking user provisioning for:', user.userId);
      }

      // First, check if user already exists
      const existingUserResult = await apolloClient.query({
        query: GET_USER_BY_COGNITO_ID,
        variables: { cognitoId: user.userId },
        fetchPolicy: 'network-only', // Always check the server
        errorPolicy: 'all'
      });

      if (existingUserResult.data?.listUsers?.length > 0) {
        // User already exists
        const existingUser = existingUserResult.data.listUsers[0];
        userRecord.value = existingUser;
        isProvisioned.value = true;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('User already provisioned:', existingUser);
        }
        return;
      }

      // User doesn't exist, create new user record
      const email = user.signInDetails?.loginId || 
                   user.attributes?.email || 
                   `${user.userId}@example.com`;
      
      const givenName = user.attributes?.given_name || '';
      const familyName = user.attributes?.family_name || '';
      const name = `${givenName} ${familyName}`.trim() || 
                  user.username || 
                  email.split('@')[0];

      // Determine role based on email or default to user
      let role = 'user';
      if (email.includes('admin') || email === 'alrussell90@icloud.com') {
        role = 'admin';
      }

      const createUserInput = {
        cognitoId: user.userId,
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
        userRecord.value = createResult.data.createUser;
        isProvisioned.value = true;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('User successfully provisioned:', createResult.data.createUser);
        }
      } else {
        throw new Error('Failed to create user record');
      }

    } catch (err: any) {
      console.error('User provisioning error:', err);
      error.value = err.message || 'Failed to provision user';
      
      // If it's an authorization error, the user might still be able to use the app
      // with just Cognito groups, so don't block them
      if (err.message?.includes('Not Authorized')) {
        error.value = 'User auto-provisioning failed due to permissions, but you can still use the app';
      }
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for changes in cognitoUser and trigger provisioning
  watch(
    cognitoUser,
    (newUser) => {
      if (newUser?.userId) {
        provisionUser(newUser);
      } else {
        isLoading.value = false;
        isProvisioned.value = false;
        userRecord.value = null;
        error.value = null;
      }
    },
    { immediate: true }
  );

  return {
    isProvisioned,
    isLoading,
    error,
    userRecord
  };
}
