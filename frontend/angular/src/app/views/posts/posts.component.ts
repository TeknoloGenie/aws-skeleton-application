import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  userId: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
}

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Posts</h1>
          <p class="mt-2 text-gray-600">Manage your blog posts</p>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p class="mt-2 text-gray-600">Loading posts...</p>
        </div>

        <!-- Posts List -->
        <div *ngIf="!loading" class="space-y-6">
          <div *ngFor="let post of posts" class="card">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span 
                    *ngIf="post.published" 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    Published
                  </span>
                  <span 
                    *ngIf="!post.published" 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    Draft
                  </span>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                  {{ post.title }}
                </h3>
                
                <p class="text-gray-600 mb-4 line-clamp-3">
                  {{ post.content }}
                </p>
                
                <div class="flex items-center text-sm text-gray-500">
                  <span>By {{ getUserName(post.userId) }}</span>
                  <span class="mx-2">•</span>
                  <span>{{ formatDate(post.createdAt) }}</span>
                </div>
              </div>
              
              <div class="ml-4 flex-shrink-0">
                <button class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                  Edit
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="posts.length === 0" class="text-center py-12">
            <div class="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No posts</h3>
            <p class="mt-1 text-sm text-gray-500">Get started by creating a new post.</p>
            <div class="mt-6">
              <button class="btn-primary">
                <svg class="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                New Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      @apply bg-white overflow-hidden shadow rounded-lg p-6;
    }
    .btn-primary {
      @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700;
    }
    .space-y-6 > * + * {
      margin-top: 1.5rem;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class PostsComponent implements OnInit {
  posts: Post[] = [];
  users: User[] = [];
  loading = true;

  ngOnInit() {
    this.loadPosts();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getUserName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  }

  private async loadPosts() {
    try {
      // TODO: Replace with actual GraphQL queries
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.users = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
        { id: '3', name: 'Bob Johnson' }
      ];

      this.posts = [
        {
          id: '1',
          title: 'Getting Started with AWS Application Accelerator',
          content: 'Learn how to build scalable applications using our model-driven framework. This comprehensive guide covers everything from setup to deployment, including best practices for GraphQL APIs, authentication, and CI/CD pipelines.',
          published: true,
          userId: '1',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          title: 'Building Real-time Applications with GraphQL Subscriptions',
          content: 'Discover how to implement real-time features in your applications using GraphQL subscriptions. We\'ll cover subscription setup, client-side implementation, and performance optimization techniques.',
          published: true,
          userId: '2',
          createdAt: '2024-01-14'
        },
        {
          id: '3',
          title: 'Advanced Security Patterns in Serverless Applications',
          content: 'Explore advanced security patterns including owner-based access control, group-based authorization, and field-level security. Learn how to implement these patterns in your AWS serverless applications.',
          published: false,
          userId: '3',
          createdAt: '2024-01-13'
        }
      ];
      
      this.loading = false;
    } catch (error) {
      console.error('Error loading posts:', error);
      this.loading = false;
    }
  }
}
