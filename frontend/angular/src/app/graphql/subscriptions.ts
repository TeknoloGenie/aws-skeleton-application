// User subscriptions
export const onCreateUser = `
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
`;

export const onUpdateUser = `
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
`;

export const onDeleteUser = `
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
`;

// Post subscriptions
export const onCreatePost = `
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
`;

export const onUpdatePost = `
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
`;

export const onDeletePost = `
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
`;

// Job completion subscription for rate-limited APIs
export const onJobCompleted = `
  subscription OnJobCompleted($requestId: ID!) {
    onJobCompleted(requestId: $requestId) {
      requestId
      status
      data
      error
    }
  }
`;
