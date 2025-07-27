// User mutations
export const createUser = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      bio
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
