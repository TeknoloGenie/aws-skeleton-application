import { gql } from '@apollo/client';

// User Queries
export const LIST_USERS = gql`
  query ListUsers {
    listUsers {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
      updatedAt
      posts {
        id
        title
        content
        published
        createdAt
      }
    }
  }
`;

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
      createdAt
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

// Post Queries
export const LIST_POSTS = gql`
  query ListPosts {
    listPosts {
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

export const GET_POST = gql`
  query GetPost($id: ID!) {
    getPost(id: $id) {
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
    }
  }
`;

export const UPDATE_POST = gql`
  mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      id
      title
      content
      userId
      published
      createdAt
      updatedAt
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

// GeoData Queries
export const GET_GEO_DATA = gql`
  query GetGeoData($address: String!) {
    getGeoData(address: $address) {
      id
      address
      latitude
      longitude
      country
      city
    }
  }
`;

// Subscriptions
export const ON_CREATE_POST = gql`
  subscription OnCreatePost {
    onCreatePost {
      id
      title
      content
      userId
      published
      createdAt
      user {
        id
        name
        email
      }
    }
  }
`;

export const ON_UPDATE_POST = gql`
  subscription OnUpdatePost {
    onUpdatePost {
      id
      title
      content
      userId
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

export const ON_CREATE_USER = gql`
  subscription OnCreateUser {
    onCreateUser {
      id
      name
      email
      bio
      role
      cognitoId
      createdAt
    }
  }
`;

export const ON_JOB_COMPLETED = gql`
  subscription OnJobCompleted($requestId: ID!) {
    onJobCompleted(requestId: $requestId) {
      requestId
      status
      result
      error
      completedAt
    }
  }
`;
