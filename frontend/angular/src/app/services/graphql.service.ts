import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class GraphqlService {
  constructor(private apollo: Apollo) {}

  // User Queries
  getUsers(): Observable<User[]> {
    return this.apollo.query<{ listUsers: User[] }>({
      query: gql`
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
      `
    }).pipe(
      map(result => result.data.listUsers || [])
    );
  }

  getUser(id: string): Observable<User> {
    return this.apollo.query<{ getUser: User }>({
      query: gql`
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
      `,
      variables: { id }
    }).pipe(
      map(result => result.data.getUser)
    );
  }

  // Post Queries
  getPosts(): Observable<Post[]> {
    return this.apollo.query<{ listPosts: Post[] }>({
      query: gql`
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
      `
    }).pipe(
      map(result => result.data.listPosts || [])
    );
  }

  getPost(id: string): Observable<Post> {
    return this.apollo.query<{ getPost: Post }>({
      query: gql`
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
      `,
      variables: { id }
    }).pipe(
      map(result => result.data.getPost)
    );
  }

  // User Mutations
  createUser(input: { name: string; email: string; bio?: string }): Observable<User> {
    return this.apollo.mutate<{ createUser: User }>({
      mutation: gql`
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
      `,
      variables: { input }
    }).pipe(
      map(result => result.data!.createUser)
    );
  }

  updateUser(id: string, input: { name?: string; email?: string; bio?: string }): Observable<User> {
    return this.apollo.mutate<{ updateUser: User }>({
      mutation: gql`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            email
            bio
            updatedAt
          }
        }
      `,
      variables: { id, input }
    }).pipe(
      map(result => result.data!.updateUser)
    );
  }

  // Post Mutations
  createPost(input: { title: string; content: string; published?: boolean }): Observable<Post> {
    return this.apollo.mutate<{ createPost: Post }>({
      mutation: gql`
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
      `,
      variables: { input }
    }).pipe(
      map(result => result.data!.createPost)
    );
  }

  updatePost(id: string, input: { title?: string; content?: string; published?: boolean }): Observable<Post> {
    return this.apollo.mutate<{ updatePost: Post }>({
      mutation: gql`
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
      `,
      variables: { id, input }
    }).pipe(
      map(result => result.data!.updatePost)
    );
  }
}
