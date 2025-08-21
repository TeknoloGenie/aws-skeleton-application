import { gql } from '@apollo/client';

// User Mutations
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      bio
      role
      cognitoId
      userId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      name
      email
      bio
      role
      cognitoId
      userId
      updatedAt
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) {
      id
    }
  }
`;

// Post Mutations
export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      userId
      published
      createdAt
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

export const UPDATE_POST = gql`
  mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      id
      title
      content
      published
      updatedAt
      user {
        id
        name
        email
      }
    }
  }
`;

export const DELETE_POST = gql`
  mutation DeletePost($input: DeletePostInput!) {
    deletePost(input: $input) {
      id
    }
  }
`;

// Input Types (for TypeScript)
export interface CreateUserInput {
  name: string;
  email: string;
  bio?: string;
  role?: string;
  cognitoId?: string;
  // Note: id, userId, createdAt, updatedAt are auto-generated
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  bio?: string;
  role?: string;
  cognitoId?: string;
  // Note: createdAt, updatedAt are auto-managed
}

export interface DeleteUserInput {
  id: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  published?: boolean;
  // Note: id, userId, createdAt, updatedAt are auto-generated
}

export interface UpdatePostInput {
  id: string;
  title?: string;
  content?: string;
  published?: boolean;
  // Note: createdAt, updatedAt are auto-managed
}

export interface DeletePostInput {
  id: string;
}
