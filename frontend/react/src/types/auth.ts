export interface User {
  id: string;
  userId: string;
  username: string;
  groups: string[];
}

export interface AuthUser {
  userId: string;
  username: string;
  signInDetails?: {
    loginId: string;
  };
}

export interface CognitoUser {
  userId: string;
  username: string;
  groups?: string[];
}
