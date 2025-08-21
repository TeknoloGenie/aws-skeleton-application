import { gql } from 'apollo-angular';

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
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
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
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      name
      email
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
  mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
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
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      id
      title
      user {
        id
        name
      }
    }
  }
`;

// Legacy string exports for backward compatibility
export const createUser = `
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

export const updateUser = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
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

export const deleteUser = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      name
      email
    }
  }
`;

export const createPost = `
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

export const updatePost = `
  mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
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

export const deletePost = `
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      id
      title
      user {
        id
        name
      }
    }
  }
`;

// TypeScript Interfaces
export interface CreateUserInput {
  name: string;
  email: string;
  bio?: string;
  role?: string;
  cognitoId?: string;
  // Note: id, userId, createdAt, updatedAt are auto-generated
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  bio?: string;
  role?: string;
  cognitoId?: string;
  // Note: createdAt, updatedAt are auto-managed
}

export interface CreatePostInput {
  title: string;
  content: string;
  published?: boolean;
  // Note: id, userId, createdAt, updatedAt are auto-generated
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  published?: boolean;
  // Note: createdAt, updatedAt are auto-managed
}
