import { gql } from 'graphql-tag'

// User queries
export const listUsers = gql`
  query ListUsers($limit: Int) {
    listUsers(limit: $limit) {
      id
      name
      email
      bio
      createdAt
      updatedAt
    }
  }
`

export const getUser = gql`
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
        published
        createdAt
      }
    }
  }
`

// Post queries
export const listPosts = gql`
  query ListPosts($limit: Int) {
    listPosts(limit: $limit) {
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
`

export const getPost = gql`
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
`

// GeoData queries
export const getGeoData = gql`
  query GetGeoData($id: ID!) {
    getGeoData(id: $id) {
      id
      address
      latitude
      longitude
      country
      city
    }
  }
`
