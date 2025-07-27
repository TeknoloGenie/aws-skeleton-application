<template>
  <div class="p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Users</h1>
      <p class="text-gray-600 mt-2">Manage your application users</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error loading users</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Users Table -->
    <div v-else class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">All Users ({{ users.length }})</h2>
        <button class="btn-primary" @click="refetch">
          Refresh
        </button>
      </div>

      <div v-if="users.length === 0" class="text-center py-12">
        <p class="text-gray-500">No users found</p>
      </div>

      <div v-else class="overflow-x-auto">
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
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-medium">
                      {{ user.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                    <div class="text-sm text-gray-500">{{ user.bio || 'No bio available' }}</div>
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
                <button class="text-primary-600 hover:text-primary-900 mr-4">
                  Edit
                </button>
                <button class="text-red-600 hover:text-red-900">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="users.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No users</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apolloClient, getCurrentUser } from '../graphql/client'
import { listUsers } from '../graphql/queries'

interface User {
  id: string
  name: string
  email: string
  bio?: string
  createdAt: string
  updatedAt: string
}

const loading = ref(true)
const users = ref<User[]>([])
const error = ref<Error | null>(null)
const currentUser = ref<any>(null)

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const loadUsers = async () => {
  try {
    loading.value = true
    error.value = null
    
    const result = await apolloClient.query({
      query: listUsers,
      variables: {
        limit: 50
      },
      fetchPolicy: 'cache-first'
    })
    
    users.value = result.data.listUsers || []
  } catch (err) {
    console.error('Error loading users:', err)
    error.value = err instanceof Error ? err : new Error('Failed to load users')
  } finally {
    loading.value = false
  }
}

const refetch = async () => {
  await loadUsers()
}

const loadCurrentUser = async () => {
  try {
    currentUser.value = await getCurrentUser()
  } catch (err) {
    console.error('Error loading current user:', err)
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      loadUsers(),
      loadCurrentUser()
    ])
  } catch (error) {
    console.error('Error loading users:', error)
    // Use mock data for demonstration
    users.value = [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        bio: 'Software developer and tech enthusiast',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        bio: 'Product manager with a passion for user experience',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      },
      {
        id: 'user-3',
        name: 'Admin User',
        email: 'admin@example.com',
        bio: 'System administrator',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  }
})
</script>
