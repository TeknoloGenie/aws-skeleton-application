import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { fetchAuthSession } from 'aws-amplify/auth';
import awsExports from '../../aws-exports';

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
  private http = inject(HttpClient);

  private readonly graphqlEndpoint = awsExports.aws_appsync_graphqlEndpoint;

  private async getAuthHeaders(): Promise<HttpHeaders> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      });
    } catch (error) {
      console.log('No authenticated user:', error);
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  }

  private executeQuery<T>(query: string, variables?: Record<string, any>): Observable<T> {
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        const body = {
          query,
          variables: variables || {}
        };

        return this.http.post<{ data: T; errors?: { message: string }[] }>(
          this.graphqlEndpoint,
          body,
          { headers }
        );
      }),
      map(response => {
        if (response.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        return response.data;
      }),
      catchError(error => {
        console.error('GraphQL Error:', error);
        return throwError(() => error);
      })
    );
  }

  // User Queries
  getUsers(): Observable<User[]> {
    const query = `
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

    return this.executeQuery<{ listUsers: User[] }>(query).pipe(
      map(result => result.listUsers || [])
    );
  }

  getUser(id: string): Observable<User> {
    const query = `
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

    return this.executeQuery<{ getUser: User }>(query, { id }).pipe(
      map(result => result.getUser)
    );
  }

  // Post Queries
  getPosts(): Observable<Post[]> {
    const query = `
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

    return this.executeQuery<{ listPosts: Post[] }>(query).pipe(
      map(result => result.listPosts || [])
    );
  }

  getPost(id: string): Observable<Post> {
    const query = `
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

    return this.executeQuery<{ getPost: Post }>(query, { id }).pipe(
      map(result => result.getPost)
    );
  }

  // User Mutations
  createUser(input: { name: string; email: string; bio?: string }): Observable<User> {
    const mutation = `
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

    return this.executeQuery<{ createUser: User }>(mutation, { input }).pipe(
      map(result => result.createUser)
    );
  }

  updateUser(id: string, input: { name?: string; email?: string; bio?: string }): Observable<User> {
    const mutation = `
      mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) {
          id
          name
          email
          bio
          updatedAt
        }
      }
    `;

    return this.executeQuery<{ updateUser: User }>(mutation, { id, input }).pipe(
      map(result => result.updateUser)
    );
  }

  // Post Mutations
  createPost(input: { title: string; content: string; published?: boolean }): Observable<Post> {
    const mutation = `
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

    return this.executeQuery<{ createPost: Post }>(mutation, { input }).pipe(
      map(result => result.createPost)
    );
  }

  updatePost(id: string, input: { title?: string; content?: string; published?: boolean }): Observable<Post> {
    const mutation = `
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

    return this.executeQuery<{ updatePost: Post }>(mutation, { id, input }).pipe(
      map(result => result.updatePost)
    );
  }
}
