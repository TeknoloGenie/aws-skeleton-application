<template>
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
            <div v-for="user in recentUsers" :key="user.id" class="flex items-center">
              <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
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
            <div v-for="post in recentPosts" :key="post.id" class="border-l-4 border-primary-500 pl-4">
              <h4 class="text-sm font-medium text-gray-900">{{ post.title }}</h4>
              <p class="text-sm text-gray-500">{{ formatDate(post.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API } from 'aws-amplify'
import { listUsers, listPosts } from '../graphql/queries'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface Post {
  id: string
  title: string
  createdAt: string
  userId: string
}

const stats = ref({
  totalUsers: 0,
  totalPosts: 0,
  apiRequests: 1247,
  activeModels: 3
})

const recentUsers = ref<User[]>([])
const recentPosts = ref<Post[]>([])

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const loadDashboardData = async () => {
  try {
    // Load users
    const usersResponse = await API.graphql({
      query: listUsers as any
    }) as any
    
    const users = usersResponse.data?.listUsers?.items || []
    recentUsers.value = users.slice(0, 5)
    stats.value.totalUsers = users.length

    // Load posts
    const postsResponse = await API.graphql({
      query: listPosts as any
    }) as any
    
    const posts = postsResponse.data?.listPosts?.items || []
    recentPosts.value = posts.slice(0, 5)
    stats.value.totalPosts = posts.length

    // Mock data for development
    if (recentUsers.value.length === 0) {
      recentUsers.value = [
        { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date().toISOString() },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date().toISOString() }
      ]
    }

    if (recentPosts.value.length === 0) {
      recentPosts.value = [
        { id: '1', title: 'Getting Started with AWS CDK', createdAt: new Date().toISOString(), userId: '1' },
        { id: '2', title: 'Building Scalable APIs', createdAt: new Date().toISOString(), userId: '2' }
      ]
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>
