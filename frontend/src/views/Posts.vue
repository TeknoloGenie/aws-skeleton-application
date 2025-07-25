<template>
  <div class="p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Posts</h1>
      <p class="text-gray-600 mt-2">Manage your application posts</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Posts Grid -->
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">All Posts</h2>
        <button class="btn-primary">
          Create Post
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="post in posts" :key="post.id" class="card hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between mb-3">
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                post.published
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              ]"
            >
              {{ post.published ? 'Published' : 'Draft' }}
            </span>
            <div class="flex space-x-2">
              <button class="text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="text-gray-400 hover:text-red-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ post.title }}</h3>
          <p class="text-gray-600 text-sm mb-4 line-clamp-3">{{ post.content }}</p>
          
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>By {{ getUserName(post.userId) }}</span>
            <span>{{ formatDate(post.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="posts.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No posts</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new post.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API } from 'aws-amplify'
import { listPosts } from '../graphql/queries'

const loading = ref(true)
const posts = ref([])
const users = ref(new Map())

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const getUserName = (userId: string) => {
  return users.value.get(userId) || 'Unknown User'
}

const loadPosts = async () => {
  try {
    loading.value = true
    const result = await API.graphql({
      query: listPosts
    })
    posts.value = result.data.listPosts || []
  } catch (error) {
    console.error('Error loading posts:', error)
    // Use mock data for demonstration
    posts.value = [
      {
        id: 'post-1',
        title: 'Getting Started with AWS CDK',
        content: 'AWS CDK is a powerful tool for defining cloud infrastructure using familiar programming languages. In this post, we\'ll explore how to get started with CDK and build your first stack.',
        userId: 'user-1',
        published: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'post-2',
        title: 'Building Scalable APIs with AppSync',
        content: 'AWS AppSync provides a managed GraphQL service that makes it easy to build scalable APIs. Learn how to create real-time applications with subscriptions and offline support.',
        userId: 'user-1',
        published: true,
        createdAt: '2024-01-20T14:30:00Z'
      },
      {
        id: 'post-3',
        title: 'User Experience Best Practices',
        content: 'Creating great user experiences requires understanding your users and their needs. This post covers essential UX principles and how to apply them in your applications.',
        userId: 'user-2',
        published: false,
        createdAt: '2024-01-25T09:15:00Z'
      }
    ]
    
    // Mock user data
    users.value.set('user-1', 'John Doe')
    users.value.set('user-2', 'Jane Smith')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPosts()
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
