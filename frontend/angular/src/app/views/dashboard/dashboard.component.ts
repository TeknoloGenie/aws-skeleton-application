import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  createdAt: string;
  userId: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-2 text-gray-600">Welcome to your AWS Application Accelerator dashboard</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ stats.totalUsers }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Total Posts</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ stats.totalPosts }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">API Requests</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ stats.apiRequests }}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Active Models</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ stats.activeModels }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
            <div class="space-y-3">
              <div *ngFor="let user of recentUsers" class="flex items-center">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-medium">
                    {{ user.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
                  <p class="text-sm text-gray-500">{{ user.email }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Posts</h3>
            <div class="space-y-3">
              <div *ngFor="let post of recentPosts" class="border-l-4 border-blue-500 pl-4">
                <h4 class="text-sm font-medium text-gray-900">{{ post.title }}</h4>
                <p class="text-sm text-gray-500">{{ formatDate(post.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      @apply bg-white overflow-hidden shadow rounded-lg p-5;
    }
    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats = {
    totalUsers: 0,
    totalPosts: 0,
    apiRequests: 1247,
    activeModels: 3
  };

  recentUsers: User[] = [];
  recentPosts: Post[] = [];

  ngOnInit() {
    this.loadDashboardData();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  private async loadDashboardData() {
    // TODO: Replace with actual GraphQL queries
    // For now, using mock data
    this.stats.totalUsers = 42;
    this.stats.totalPosts = 128;

    this.recentUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-15' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: '2024-01-14' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', createdAt: '2024-01-13' }
    ];

    this.recentPosts = [
      { id: '1', title: 'Getting Started with AWS', createdAt: '2024-01-15', userId: '1' },
      { id: '2', title: 'Building Scalable Applications', createdAt: '2024-01-14', userId: '2' },
      { id: '3', title: 'GraphQL Best Practices', createdAt: '2024-01-13', userId: '3' }
    ];
  }
}
