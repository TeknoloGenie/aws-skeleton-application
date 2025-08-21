import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphQLClientService } from '../../graphql/client';
import { listPosts, createPost, updatePost, deletePost } from '../../graphql/queries';

interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface PostForm {
  title: string;
  content: string;
  published: boolean;
}

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Posts</h1>
              <p class="mt-2 text-gray-600">Manage your blog posts</p>
            </div>
            <button 
              (click)="openCreateDialog()"
              class="btn-primary"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              New Post
            </button>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error loading posts</h3>
              <div class="mt-2 text-sm text-red-700">{{ error }}</div>
            </div>
          </div>
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
                  <span>By {{ getUserName(post) }}</span>
                  <span class="mx-2">•</span>
                  <span>{{ formatDate(post.createdAt) }}</span>
                </div>
              </div>
              
              <div class="ml-4 flex-shrink-0 flex space-x-2">
                <button 
                  (click)="openEditDialog(post)"
                  class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Edit
                </button>
                <button 
                  (click)="deletePostConfirm(post)"
                  class="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Delete
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
              <button (click)="openCreateDialog()" class="btn-primary">
                <svg class="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                New Post
              </button>
            </div>
          </div>
        </div>

        <!-- Create/Edit Dialog -->
        <div *ngIf="showDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                {{ isEditing ? 'Edit Post' : 'Create New Post' }}
              </h3>
              
              <form (ngSubmit)="submitPostForm()">
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    [(ngModel)]="postForm.title"
                    name="title"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter post title"
                  />
                </div>

                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    required
                    [(ngModel)]="postForm.content"
                    name="content"
                    rows="6"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter post content"
                  ></textarea>
                </div>

                <div class="mb-6">
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      [(ngModel)]="postForm.published"
                      name="published"
                      class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span class="ml-2 text-sm text-gray-700">Publish immediately</span>
                  </label>
                </div>

                <div class="flex justify-end space-x-3">
                  <button
                    type="button"
                    (click)="closeDialog()"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    [disabled]="submitting"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    [disabled]="submitting"
                  >
                    {{ submitting ? 'Saving...' : (isEditing ? 'Update Post' : 'Create Post') }}
                  </button>
                </div>
              </form>
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
  loading = true;
  error = '';
  showDialog = false;
  isEditing = false;
  editingPost: Post | null = null;
  submitting = false;

  postForm: PostForm = {
    title: '',
    content: '',
    published: false
  };

  constructor(private graphqlClient: GraphQLClientService) {}

  ngOnInit() {
    console.log('PostsComponent initialized');
    this.loadPosts();
  }

  async loadPosts() {
    console.log('=== LOADING POSTS ===');
    this.loading = true;
    this.error = '';
    
    try {
      console.log('1. About to call GraphQL client...');
      console.log('2. Query:', listPosts);
      
      const result = await this.graphqlClient.query(listPosts, {});
      console.log('3. Raw GraphQL result:', JSON.stringify(result, null, 2));
      
      if (result.data && result.data.listPosts) {
        this.posts = result.data.listPosts;
        console.log('4. Successfully loaded posts:', this.posts.length, 'posts');
        console.log('5. Posts data:', this.posts);
      } else {
        console.warn('4. No posts data in result structure:', result);
        this.posts = [];
      }
    } catch (err: any) {
      this.error = err?.message || 'Failed to load posts';
      console.error('4. Error loading posts:', err);
      console.error('5. Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      });
      this.posts = [];
    } finally {
      this.loading = false;
      console.log('6. Loading complete. Posts count:', this.posts.length);
      console.log('=== END LOADING POSTS ===');
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getUserName(post: Post): string {
    return post.user?.name || 'Unknown User';
  }

  openCreateDialog() {
    this.isEditing = false;
    this.editingPost = null;
    this.postForm = {
      title: '',
      content: '',
      published: false
    };
    this.showDialog = true;
  }

  openEditDialog(post: Post) {
    this.isEditing = true;
    this.editingPost = post;
    this.postForm = {
      title: post.title,
      content: post.content,
      published: post.published
    };
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
    this.isEditing = false;
    this.editingPost = null;
    this.submitting = false;
  }

  async submitPostForm() {
    if (this.submitting) return;
    
    this.submitting = true;
    
    try {
      if (this.isEditing && this.editingPost) {
        // Update existing post
        const result = await this.graphqlClient.mutate(updatePost, {
          input: {
            id: this.editingPost.id,
            title: this.postForm.title,
            content: this.postForm.content,
            published: this.postForm.published
          }
        });
        
        console.log('Update post result:', result);
      } else {
        // Create new post
        const result = await this.graphqlClient.mutate(createPost, {
          input: {
            title: this.postForm.title,
            content: this.postForm.content,
            published: this.postForm.published
          }
        });
        
        console.log('Create post result:', result);
      }
      
      this.closeDialog();
      await this.loadPosts(); // Refresh the list
    } catch (err: any) {
      this.error = err?.message || 'Failed to save post';
      console.error('Error saving post:', err);
      alert('Failed to save post: ' + (err?.message || 'Unknown error'));
    } finally {
      this.submitting = false;
    }
  }

  async deletePostConfirm(post: Post) {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
      return;
    }
    
    try {
      const result = await this.graphqlClient.mutate(deletePost, {
        input: { id: post.id }
      });
      
      console.log('Delete post result:', result);
      await this.loadPosts(); // Refresh the list
    } catch (err: any) {
      this.error = err?.message || 'Failed to delete post';
      console.error('Error deleting post:', err);
      alert('Failed to delete post: ' + (err?.message || 'Unknown error'));
    }
  }
}
