<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Posts</h1>
        <p class="mt-2 text-gray-600">Manage your blog posts</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p class="mt-2 text-gray-600">Loading posts...</p>
      </div>

      <!-- Posts List -->
      <div v-else class="space-y-6">
        <div v-for="post in posts" :key="post.id" class="card">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <span v-if="post.published" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Published
                </span>
                <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
              <button class="text-primary-600 hover:text-primary-900 text-sm font-medium">
                Edit
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="posts.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No posts</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new post.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API } from 'aws-amplify'
import { listPosts } from '../graphql/queries'

interface Post {
  id: string
  title: string
  content: string
  userId: string
  published: boolean
  createdAt: string
}

const posts = ref<Post[]>([])
const loading = ref(false)
const users = ref(new Map<string, string>())

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
      query: listPosts as any
    }) as any
    
    posts.value = result.data?.listPosts?.items || []

    // Mock data for development
    if (posts.value.length === 0) {
      posts.value = [
        {
          id: '1',
          title: 'Getting Started with AWS CDK',
          content: 'AWS CDK is a powerful tool for defining cloud infrastructure using familiar programming languages...',
          userId: 'user-1',
          published: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Building Scalable APIs with AppSync',
          content: 'AWS AppSync provides a managed GraphQL service that makes it easy to build scalable APIs...',
          userId: 'user-1',
          published: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          title: 'User Experience Best Practices',
          content: 'Creating great user experiences requires understanding your users and their needs...',
          userId: 'user-2',
          published: false,
          createdAt: new Date().toISOString()
        }
      ]
    }

    // Mock user data
    users.value.set('user-1', 'John Doe')
    users.value.set('user-2', 'Jane Smith')
    
  } catch (error) {
    console.error('Error loading posts:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPosts()
})
</script>
