import { gql } from '@apollo/client';

// User Queries
export const LIST_USERS = gql`
  query ListUsers {
    listUsers {
      id
      name
      email
      bio
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
