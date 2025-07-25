import { gql } from 'graphql-tag'

// User subscriptions
export const onCreateUser = gql`
  subscription OnCreateUser {
    onCreateUser {
      id
      name
      email
      bio
      createdAt
      updatedAt
    }
  }
`

export const onUpdateUser = gql`
  subscription OnUpdateUser {
    onUpdateUser {
      id
      name
      email
      bio
      createdAt
      updatedAt
    }
  }
`

export const onDeleteUser = gql`
  subscription OnDeleteUser {
    onDeleteUser {
      id
      name
      email
      bio
      createdAt
      updatedAt
    }
  }
`

// Post subscriptions
export const onCreatePost = gql`
  subscription OnCreatePost {
    onCreatePost {
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

export const onUpdatePost = gql`
  subscription OnUpdatePost {
    onUpdatePost {
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

export const onDeletePost = gql`
  subscription OnDeletePost {
    onDeletePost {
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

// Job completion subscription for rate-limited APIs
export const onJobCompleted = gql`
  subscription OnJobCompleted($requestId: ID!) {
    onJobCompleted(requestId: $requestId) {
      requestId
      status
      data
      error
    }
  }
`
