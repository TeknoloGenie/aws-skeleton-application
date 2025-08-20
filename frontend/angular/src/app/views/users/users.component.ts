import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fetchAuthSession } from '@aws-amplify/auth';
import { GraphQLClientService } from '../../graphql/client';
import { createUser, deleteUser, listUsers, updateUser } from '../../graphql/queries';

interface CognitoUser {
  Username: string;
  UserStatus: string;
  UserCreateDate: string;
  Attributes: { Name: string; Value: string }[];
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  bio?: string;
  role: string;
  cognitoId: string;
  createdAt: string;
  updatedAt: string;
}

interface UserForm {
  name: string;
  email: string;
  bio: string;
  role: string;
}

interface CognitoUserForm {
  email: string;
  givenName: string;
  familyName: string;
  temporaryPassword: string;
  sendEmail: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="mb-8">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Users</h1>
            <p class="text-gray-600 mt-2">Manage application users and their profiles</p>
          </div>
          <div class="flex space-x-3">
            <button 
              (click)="refreshUsers()"
              [disabled]="loading"
              class="btn-secondary"
            >
              <svg *ngIf="loading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
            <button 
              (click)="openCreateCognitoDialog()"
              class="btn-primary"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Create User
            </button>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading users</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="ml-3 text-gray-600">Loading users...</p>
      </div>

      <!-- Users Table -->
      <div *ngIf="!loading" class="card">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900">All Users ({{ displayUsers.length }})</h2>
        </div>

        <div *ngIf="displayUsers.length === 0" class="text-center py-12">
          <div class="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
            </svg>
          </div>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p class="mt-1 text-sm text-gray-500">No users are currently registered.</p>
        </div>

        <div *ngIf="displayUsers.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let user of displayUsers">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm font-medium">
                        {{ getUserInitials(user) }}
                      </span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        ID: {{ user.cognitoUser.Username }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span [class]="'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + getRoleBadgeClass(user.role)">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span [class]="'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + getStatusBadgeClass(user.cognitoUser)">
                    {{ user.cognitoUser.UserStatus }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ formatDate(user.createdAt) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      *ngIf="!user.hasUserRecord"
                      (click)="openCreateUserRecordDialog(user.cognitoUser)"
                      class="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Provision
                    </button>
                    <button
                      *ngIf="user.hasUserRecord"
                      (click)="openEditDialog(user)"
                      class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      *ngIf="user.hasUserRecord"
                      (click)="deleteUser(user)"
                      class="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create/Edit User Record Dialog -->
      <div *ngIf="showDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              {{ isEditing ? 'Edit User' : 'Provision User Profile' }}
            </h3>
            
            <form (ngSubmit)="submitUserForm()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  [(ngModel)]="userForm.name"
                  name="name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  [(ngModel)]="userForm.email"
                  name="email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  [(ngModel)]="userForm.bio"
                  name="bio"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user bio (optional)"
                ></textarea>
              </div>

              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  [(ngModel)]="userForm.role"
                  name="role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
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
                  {{ submitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create Profile') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Create Cognito User Dialog -->
      <div *ngIf="showCreateCognitoDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Cognito User</h3>
            
            <form (ngSubmit)="submitCognitoUserForm()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  [(ngModel)]="cognitoUserForm.email"
                  name="cognitoEmail"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  [(ngModel)]="cognitoUserForm.givenName"
                  name="givenName"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  [(ngModel)]="cognitoUserForm.familyName"
                  name="familyName"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  [(ngModel)]="cognitoUserForm.temporaryPassword"
                  name="temporaryPassword"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter temporary password"
                />
              </div>

              <div class="mb-6">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    [(ngModel)]="cognitoUserForm.sendEmail"
                    name="sendEmail"
                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span class="ml-2 text-sm text-gray-700">Send welcome email</span>
                </label>
              </div>

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  (click)="closeCreateCognitoDialog()"
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
                  {{ submitting ? 'Creating...' : 'Create User' }}
                </button>
              </div>
            </form>
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
      @apply bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50;
    }
    .btn-secondary {
      @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50;
    }
  `]
})
export class UsersComponent implements OnInit {
  cognitoUsers: CognitoUser[] = [];
  userRecords: UserRecord[] = [];
  loading = true;
  error = '';
  showDialog = false;
  showCreateCognitoDialog = false;
  isEditing = false;
  submitting = false;
  editingUser: UserRecord | null = null;

  userForm: UserForm = {
    name: '',
    email: '',
    bio: '',
    role: 'user'
  };

  cognitoUserForm: CognitoUserForm = {
    email: '',
    givenName: '',
    familyName: '',
    temporaryPassword: '',
    sendEmail: true
  };

  constructor(private graphqlClient: GraphQLClientService) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    this.error = '';
    
    try {
      await Promise.all([
        this.loadCognitoUsers(),
        this.loadUserRecords()
      ]);
    } catch (err: any) {
      this.error = err?.message || 'Failed to load users';
    } finally {
      this.loading = false;
    }
  }

  private async loadCognitoUsers() {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Get admin API URL from aws-exports
      // @ts-ignore - aws-exports.js is generated and doesn't have type declarations
      const awsExports = (await import('../../../aws-exports.js')).default;
      const adminApiUrl = awsExports.aws_admin_api_endpoint || '';
      const apiUrl = `${adminApiUrl}api/admin/cognito/users`;

      console.log('Loading Cognito users from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Cognito users: ${response.statusText}`);
      }

      const data = await response.json();
      this.cognitoUsers = data.users || [];
      console.log('Loaded Cognito users:', this.cognitoUsers.length);
    } catch (err: any) {
      console.error('Error loading Cognito users:', err);
      // For development, show empty list if API fails
      this.cognitoUsers = [];
    }
  }

  private async loadUserRecords() {
    try {
      console.log('=== LOADING USER RECORDS ===');
      const result = await this.graphqlClient.query(listUsers, {});
      console.log('User records query result:', result);
      
      if (result.data && result.data.listUsers) {
        this.userRecords = result.data.listUsers;
        console.log('Successfully loaded user records:', this.userRecords.length, 'records');
      } else {
        this.userRecords = [];
      }
      console.log('=== END LOADING USER RECORDS ===');
    } catch (err: any) {
      console.error('Error loading User records:', err);
      this.userRecords = [];
    }
  }

  refreshUsers() {
    this.loadUsers();
  }

  // Display combined users (Cognito users with their User records)
  get displayUsers() {
    return this.cognitoUsers.map(cognitoUser => {
      const userRecord = this.userRecords.find(record => record.cognitoId === cognitoUser.Username);
      return {
        cognitoUser,
        userRecord,
        name: userRecord?.name || this.getUserDisplayName(cognitoUser),
        email: userRecord?.email || this.getUserEmail(cognitoUser),
        role: userRecord?.role || 'user',
        createdAt: userRecord?.createdAt || cognitoUser.UserCreateDate,
        hasUserRecord: !!userRecord
      };
    });
  }

  getUserDisplayName(cognitoUser: CognitoUser): string {
    const givenName = this.getAttribute(cognitoUser, 'given_name') || '';
    const familyName = this.getAttribute(cognitoUser, 'family_name') || '';
    return `${givenName} ${familyName}`.trim() || cognitoUser.Username;
  }

  getUserEmail(cognitoUser: CognitoUser): string {
    return this.getAttribute(cognitoUser, 'email') || '';
  }

  private getAttribute(cognitoUser: CognitoUser, name: string): string {
    const attr = cognitoUser.Attributes.find(a => a.Name === name);
    return attr ? attr.Value : '';
  }

  getUserInitials(user: any): string {
    const name = user.name || '';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase() || 'U';
  }

  getRoleBadgeClass(role: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800';
      case 'user':
      default:
        return 'bg-green-100 text-green-800';
    }
  }

  getStatusBadgeClass(cognitoUser: CognitoUser): string {
    switch (cognitoUser.UserStatus) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'UNCONFIRMED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FORCE_CHANGE_PASSWORD':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Create Cognito User Dialog
  openCreateCognitoDialog() {
    this.cognitoUserForm = {
      email: '',
      givenName: '',
      familyName: '',
      temporaryPassword: '',
      sendEmail: true
    };
    this.showCreateCognitoDialog = true;
  }

  closeCreateCognitoDialog() {
    this.showCreateCognitoDialog = false;
    this.submitting = false;
  }

  async submitCognitoUserForm() {
    if (this.submitting) return;
    
    this.submitting = true;
    
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() || session.tokens?.accessToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Get admin API URL from aws-exports
      // @ts-ignore - aws-exports.js is generated and doesn't have type declarations
      const awsExports = (await import('../../../aws-exports.js')).default;
      const adminApiUrl = awsExports.aws_admin_api_endpoint || '';
      const apiUrl = `${adminApiUrl}api/admin/cognito/users`;

      console.log('Creating Cognito user via:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.cognitoUserForm.email,
          givenName: this.cognitoUserForm.givenName,
          familyName: this.cognitoUserForm.familyName,
          temporaryPassword: this.cognitoUserForm.temporaryPassword,
          sendEmail: this.cognitoUserForm.sendEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Cognito user');
      }

      const result = await response.json();
      console.log('Cognito user created:', result);

      this.closeCreateCognitoDialog();
      await this.loadCognitoUsers(); // Refresh Cognito users
    } catch (err: any) {
      this.error = err?.message || 'Failed to create Cognito user';
      console.error('Error creating Cognito user:', err);
      alert('Failed to create Cognito user: ' + (err?.message || 'Unknown error'));
    } finally {
      this.submitting = false;
    }
  }

  // User Record Management
  openCreateUserRecordDialog(cognitoUser: CognitoUser) {
    this.isEditing = false;
    this.editingUser = null;
    this.userForm = {
      name: this.getUserDisplayName(cognitoUser),
      email: this.getUserEmail(cognitoUser),
      bio: '',
      role: 'user'
    };
    this.showDialog = true;
  }

  openEditDialog(user: any) {
    if (user.userRecord) {
      this.isEditing = true;
      this.editingUser = user.userRecord;
      this.userForm = {
        name: user.userRecord.name,
        email: user.userRecord.email,
        bio: user.userRecord.bio || '',
        role: user.userRecord.role
      };
      this.showDialog = true;
    }
  }

  closeDialog() {
    this.showDialog = false;
    this.editingUser = null;
    this.submitting = false;
  }

  async submitUserForm() {
    if (this.submitting) return;
    
    this.submitting = true;
    
    try {
      const input = {
        name: this.userForm.name,
        email: this.userForm.email,
        bio: this.userForm.bio,
        role: this.userForm.role
      };

      if (this.isEditing && this.editingUser) {
        const result = await this.graphqlClient.mutate(updateUser, {
          input: { ...input, id: this.editingUser.id }
        });
        console.log('Update user result:', result);
      } else {
        const result = await this.graphqlClient.mutate(createUser, { 
          input 
        });
        console.log('Create user result:', result);
      }
      
      this.closeDialog();
      await this.loadUserRecords(); // Refresh user records
    } catch (err: any) {
      this.error = err?.message || 'Failed to save user';
      console.error('Error saving user:', err);
      alert('Failed to save user: ' + (err?.message || 'Unknown error'));
    } finally {
      this.submitting = false;
    }
  }

  async deleteUser(user: any) {
    if (!user.userRecord) return;
    
    if (!confirm(`Are you sure you want to delete "${user.name}"?`)) {
      return;
    }
    
    try {
      const result = await this.graphqlClient.mutate(deleteUser, {
        input: { id: user.userRecord.id }
      });
      
      console.log('Delete user result:', result);
      await this.loadUserRecords(); // Refresh the list
    } catch (err: any) {
      this.error = err?.message || 'Failed to delete user';
      console.error('Error deleting user:', err);
      alert('Failed to delete user: ' + (err?.message || 'Unknown error'));
    }
  }
}
