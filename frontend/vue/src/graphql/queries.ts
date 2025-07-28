import { gql } from 'graphql-tag'

// User queries
export const listUsers = gql`
  query ListUsers($limit: Int) {
    listUsers(limit: $limit) {
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
`

export const getUser = gql`
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
        published
        createdAt
      }
    }
  }
`

// User mutations
export const createUser = gql`
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
`

export const updateUser = gql`
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
`

export const deleteUser = gql`
  mutation DeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) {
      id
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

// Post mutations
export const createPost = gql`
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
`

export const updatePost = gql`
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
`

export const deletePost = gql`
  mutation DeletePost($input: DeletePostInput!) {
    deletePost(input: $input) {
      id
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
