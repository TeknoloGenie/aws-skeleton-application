// User queries
export const listUsers = `
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

export const getUser = `
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
`;

// User mutations
export const createUser = `
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

export const updateUser = `
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

export const deleteUser = `
  mutation DeleteUser($input: DeleteUserInput!) {
    deleteUser(input: $input) {
      id
    }
  }
`;

// Post queries
export const listPosts = `
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

export const getPost = `
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

// Post mutations
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
    }
  }
`;

export const updatePost = `
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

export const deletePost = `
  mutation DeletePost($input: DeletePostInput!) {
    deletePost(input: $input) {
      id
    }
  }
`;

// GeoData queries
export const getGeoData = `
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
`;
