<template>
  <div class="settings-page">
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Page Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
          <p class="mt-2 text-gray-600">Manage your account preferences and post settings</p>
        </div>

        <!-- Settings Navigation -->
        <div class="bg-white shadow rounded-lg mb-8">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                ]"
              >
                <component :is="tab.icon" class="w-5 h-5 mr-2 inline" />
                {{ tab.name }}
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="space-y-8">
          <!-- User Settings Tab -->
          <div v-if="activeTab === 'user'" class="tab-content">
            <UserSettings />
          </div>

          <!-- Post Settings Tab -->
          <div v-if="activeTab === 'posts'" class="tab-content">
            <div class="bg-white shadow rounded-lg p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Post Settings</h2>
              
              <!-- Post Selection -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Post</label>
                <select 
                  v-model="selectedPostId" 
                  @change="onPostSelect"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a post to configure settings</option>
                  <option v-for="post in userPosts" :key="post.id" :value="post.id">
                    {{ post.title }}
                  </option>
                </select>
              </div>

              <!-- Post Settings Component -->
              <PostSettings v-if="selectedPostId" :postId="selectedPostId" />
              
              <!-- No Post Selected -->
              <div v-else class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">No post selected</h3>
                <p class="mt-1 text-sm text-gray-500">Choose a post from the dropdown to configure its settings.</p>
              </div>
            </div>
          </div>

          <!-- Account Tab -->
          <div v-if="activeTab === 'account'" class="tab-content">
            <div class="bg-white shadow rounded-lg p-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
              
              <!-- Account Information -->
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input 
                        type="text" 
                        :value="currentUser?.name || ''"
                        readonly
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input 
                        type="email" 
                        :value="currentUser?.email || ''"
                        readonly
                        class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div class="border-t border-gray-200 pt-6">
                  <h3 class="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
                  <div class="space-y-4">
                    <button
                      @click="exportData"
                      class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export My Data
                    </button>
                    <button
                      @click="resetSettings"
                      class="inline-flex items-center px-4 py-2 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset All Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import { getCurrentUser, type AuthUser } from 'aws-amplify/auth';
import UserSettings from '../components/UserSettings.vue';
import PostSettings from '../components/PostSettings.vue';
import { listPosts } from '../graphql/queries';

// Tab configuration
const tabs = [
  {
    id: 'user',
    name: 'User Preferences',
    icon: 'UserIcon'
  },
  {
    id: 'posts',
    name: 'Post Settings',
    icon: 'DocumentIcon'
  },
  {
    id: 'account',
    name: 'Account',
    icon: 'CogIcon'
  }
];

// Reactive data
const activeTab = ref('user');
const selectedPostId = ref('');
const currentUser = ref<AuthUser | null>(null);
const userPosts = ref<any[]>([]);

// Load user data and posts
const loadUserData = async () => {
  try {
    // Get current user
    const user = await getCurrentUser();
    currentUser.value = user;

    // Load user's posts
    const { result } = await useQuery(listPosts, {
      filter: {
        userId: { eq: user.userId }
      }
    });

    if (result.value?.listPosts?.items) {
      userPosts.value = result.value.listPosts.items;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
};

// Handle post selection
const onPostSelect = () => {
  // PostSettings component will automatically load settings for the selected post
};

// Export user data
const exportData = async () => {
  try {
    // This would typically call an API to generate and download user data
    alert('Data export functionality would be implemented here');
  } catch (error) {
    console.error('Error exporting data:', error);
  }
};

// Reset all settings
const resetSettings = async () => {
  if (confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
    try {
      // This would typically call an API to reset all user settings
      alert('Settings reset functionality would be implemented here');
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }
};

// Initialize component
onMounted(() => {
  loadUserData();
});
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
}

.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
