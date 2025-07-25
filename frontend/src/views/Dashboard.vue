<template>
  <div class="p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-600 mt-2">Welcome to your AWS Application Accelerator dashboard</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Users</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalUsers }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Posts</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalPosts }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">API Requests</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.apiRequests }}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Models</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.activeModels }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
        <div class="space-y-3">
          <div v-for="user in recentUsers" :key="user.id" class="flex items-center">
            <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span class="text-white text-sm font-medium">
                {{ user.name.charAt(0).toUpperCase() }}
              </span>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
              <p class="text-xs text-gray-500">{{ user.email }}</p>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <router-link to="/users" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all users →
          </router-link>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Posts</h3>
        <div class="space-y-3">
          <div v-for="post in recentPosts" :key="post.id" class="border-l-4 border-primary-500 pl-3">
            <p class="text-sm font-medium text-gray-900">{{ post.title }}</p>
            <p class="text-xs text-gray-500">{{ formatDate(post.createdAt) }}</p>
          </div>
        </div>
        <div class="mt-4">
          <router-link to="/posts" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all posts →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API } from 'aws-amplify'
import { listUsers, listPosts } from '../graphql/queries'

const stats = ref({
  totalUsers: 0,
  totalPosts: 0,
  apiRequests: 1247,
  activeModels: 3
})

const recentUsers = ref([])
const recentPosts = ref([])

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const loadDashboardData = async () => {
  try {
    // Load users
    const usersResult = await API.graphql({
      query: listUsers,
      variables: { limit: 5 }
    })
    recentUsers.value = usersResult.data.listUsers || []
    stats.value.totalUsers = recentUsers.value.length

    // Load posts
    const postsResult = await API.graphql({
      query: listPosts,
      variables: { limit: 5 }
    })
    recentPosts.value = postsResult.data.listPosts || []
    stats.value.totalPosts = recentPosts.value.length
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    // Use mock data for demonstration
    recentUsers.value = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
    ]
    recentPosts.value = [
      { id: '1', title: 'Getting Started with AWS CDK', createdAt: '2024-01-15T10:00:00Z' },
      { id: '2', title: 'Building Scalable APIs', createdAt: '2024-01-20T14:30:00Z' }
    ]
    stats.value.totalUsers = 2
    stats.value.totalPosts = 2
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>
