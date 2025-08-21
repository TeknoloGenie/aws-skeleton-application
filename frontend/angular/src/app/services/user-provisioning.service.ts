import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';

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

interface UserProvisioningState {
  isProvisioned: boolean;
  isLoading: boolean;
  error: string | null;
  userRecord: any | null;
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

@Injectable({
  providedIn: 'root'
})
export class UserProvisioningService {
  private stateSubject = new BehaviorSubject<UserProvisioningState>({
    isProvisioned: false,
    isLoading: true,
    error: null,
    userRecord: null
  });

  public state$ = this.stateSubject.asObservable();

  constructor(private apollo: Apollo) {}

  provisionUser(cognitoUser: CognitoUser): Observable<UserProvisioningState> {
    if (!cognitoUser?.userId) {
      this.updateState({ isLoading: false, isProvisioned: false, error: null, userRecord: null });
      return this.state$;
    }

    this.updateState({ isLoading: true, error: null });

    if (process.env['NODE_ENV'] === 'development') {
      console.log('Checking user provisioning for:', cognitoUser.userId);
    }

    return this.apollo.query({
      query: GET_USER_BY_COGNITO_ID,
      variables: { cognitoId: cognitoUser.userId },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    }).pipe(
      switchMap((result: any) => {
        if (result.data?.listUsers?.length > 0) {
          // User already exists
          const existingUser = result.data.listUsers[0];
          
          if (process.env['NODE_ENV'] === 'development') {
            console.log('User already provisioned:', existingUser);
          }
          
          this.updateState({
            isProvisioned: true,
            isLoading: false,
            error: null,
            userRecord: existingUser
          });
          
          return this.state$;
        }

        // User doesn't exist, create new user record
        return this.createNewUser(cognitoUser);
      }),
      catchError((error) => {
        console.error('User provisioning error:', error);
        const errorMessage = error.message || 'Failed to provision user';
        
        // If it's an authorization error, the user might still be able to use the app
        // with just Cognito groups, so don't block them
        const finalError = error.message?.includes('Not Authorized') 
          ? 'User auto-provisioning failed due to permissions, but you can still use the app'
          : errorMessage;

        this.updateState({
          isProvisioned: false,
          isLoading: false,
          error: finalError,
          userRecord: null
        });

        return this.state$;
      })
    );
  }

  private createNewUser(cognitoUser: CognitoUser): Observable<UserProvisioningState> {
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

    if (process.env['NODE_ENV'] === 'development') {
      console.log('Creating new user record:', createUserInput);
    }

    return this.apollo.mutate({
      mutation: CREATE_USER,
      variables: { input: createUserInput },
      errorPolicy: 'all'
    }).pipe(
      tap((result: any) => {
        if (result.data?.createUser) {
          if (process.env['NODE_ENV'] === 'development') {
            console.log('User successfully provisioned:', result.data.createUser);
          }
          
          this.updateState({
            isProvisioned: true,
            isLoading: false,
            error: null,
            userRecord: result.data.createUser
          });
        } else {
          throw new Error('Failed to create user record');
        }
      }),
      switchMap(() => this.state$)
    );
  }

  private updateState(partialState: Partial<UserProvisioningState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }

  // Getter methods for easy access to current state
  get isProvisioned(): boolean {
    return this.stateSubject.value.isProvisioned;
  }

  get isLoading(): boolean {
    return this.stateSubject.value.isLoading;
  }

  get error(): string | null {
    return this.stateSubject.value.error;
  }

  get userRecord(): any | null {
    return this.stateSubject.value.userRecord;
  }

  // Reset state (useful for logout)
  reset(): void {
    this.updateState({
      isProvisioned: false,
      isLoading: false,
      error: null,
      userRecord: null
    });
  }
}
