import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Users</h1>
        <p class="text-gray-600 mt-2">Manage your application users</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading users</h3>
            <div class="mt-2 text-sm text-red-700">
              {{ error }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Users Table -->
      <div *ngIf="!loading" class="card">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">All Users ({{ users.length }})</h2>
          <button class="btn-primary" (click)="refetch()">
            Refresh
          </button>
        </div>

        <div *ngIf="users.length === 0" class="text-center py-12">
          <p class="text-gray-500">No users found</p>
        </div>

        <div *ngIf="users.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let user of users">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm font-medium">
                        {{ user.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                      <div class="text-sm text-gray-500">ID: {{ user.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ formatDate(user.createdAt) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                  <button class="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      @apply bg-white overflow-hidden shadow rounded-lg p-6;
    }
    .btn-primary {
      @apply bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors;
    }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.loadUsers();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  async refetch() {
    this.loading = true;
    this.error = null;
    await this.loadUsers();
  }

  private async loadUsers() {
    try {
      // TODO: Replace with actual GraphQL query
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.users = [
        { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-15' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: '2024-01-14' },
        { id: '3', name: 'Bob Johnson', email: 'bob@example.com', createdAt: '2024-01-13' },
        { id: '4', name: 'Alice Brown', email: 'alice@example.com', createdAt: '2024-01-12' },
        { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', createdAt: '2024-01-11' }
      ];
      
      this.loading = false;
    } catch (err) {
      this.error = 'Failed to load users';
      this.loading = false;
    }
  }
}
