<template>
  <div class="user-settings">
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">User Settings</h2>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading settings</h3>
            <div class="mt-2 text-sm text-red-700">{{ error.message }}</div>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div v-if="!loading" class="space-y-6">
        <!-- Theme Settings -->
        <div class="border-b border-gray-200 pb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Theme Preferences</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
              <select 
                v-model="themeSettings.theme" 
                @change="updateThemeSetting"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <input 
                type="color" 
                v-model="themeSettings.primaryColor" 
                @change="updateThemeSetting"
                class="block w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
              <select 
                v-model="themeSettings.fontSize" 
                @change="updateThemeSetting"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div class="flex items-center">
              <input 
                type="checkbox" 
                id="compactMode" 
                v-model="themeSettings.compactMode" 
                @change="updateThemeSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="compactMode" class="ml-2 block text-sm text-gray-900">Compact Mode</label>
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div class="border-b border-gray-200 pb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Email Notifications</label>
                <p class="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <input 
                type="checkbox" 
                v-model="notificationSettings.email" 
                @change="updateNotificationSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Push Notifications</label>
                <p class="text-sm text-gray-500">Receive push notifications in browser</p>
              </div>
              <input 
                type="checkbox" 
                v-model="notificationSettings.push" 
                @change="updateNotificationSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">SMS Notifications</label>
                <p class="text-sm text-gray-500">Receive notifications via SMS</p>
              </div>
              <input 
                type="checkbox" 
                v-model="notificationSettings.sms" 
                @change="updateNotificationSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
              <select 
                v-model="notificationSettings.frequency" 
                @change="updateNotificationSetting"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Privacy Settings -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
              <select 
                v-model="privacySettings.profileVisibility" 
                @change="updatePrivacySetting"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Show Email</label>
                <p class="text-sm text-gray-500">Display email address on profile</p>
              </div>
              <input 
                type="checkbox" 
                v-model="privacySettings.showEmail" 
                @change="updatePrivacySetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Allow Messages</label>
                <p class="text-sm text-gray-500">Allow other users to send you messages</p>
              </div>
              <input 
                type="checkbox" 
                v-model="privacySettings.allowMessages" 
                @change="updatePrivacySetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Save Status -->
      <div v-if="saveStatus" class="mt-6 p-4 rounded-md" :class="saveStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
        {{ saveStatus.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { GET_USER_SETTINGS, CREATE_SETTING, UPDATE_SETTING } from '../graphql/settings';
import { getCurrentUser } from 'aws-amplify/auth';

// Reactive data
const loading = ref(true);
const error = ref(null);
const saveStatus = ref(null);
const currentUser = ref(null);

// Settings data
const themeSettings = reactive({
  theme: 'light',
  primaryColor: '#3b82f6',
  fontSize: 'medium',
  compactMode: false
});

const notificationSettings = reactive({
  email: true,
  push: false,
  sms: false,
  frequency: 'daily'
});

const privacySettings = reactive({
  profileVisibility: 'public',
  showEmail: false,
  allowMessages: true
});

// Store setting IDs for updates
const settingIds = reactive({
  theme: null,
  notifications: null,
  privacy: null
});

// GraphQL mutations
const { mutate: createSetting } = useMutation(CREATE_SETTING);
const { mutate: updateSetting } = useMutation(UPDATE_SETTING);

// Load user settings
const loadUserSettings = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Get current user
    const user = await getCurrentUser();
    currentUser.value = user;

    // Query user settings
    const { result } = await useQuery(GET_USER_SETTINGS, {
      entityId: user.userId,
      type: 'user'
    });

    if (result.value?.listSettings?.items) {
      const settings = result.value.listSettings.items;
      
      // Process each setting
      settings.forEach(setting => {
        if (setting.key === 'theme') {
          Object.assign(themeSettings, setting.value);
          settingIds.theme = setting.id;
        } else if (setting.key === 'notifications') {
          Object.assign(notificationSettings, setting.value);
          settingIds.notifications = setting.id;
        } else if (setting.key === 'privacy') {
          Object.assign(privacySettings, setting.value);
          settingIds.privacy = setting.id;
        }
      });
    }
  } catch (err) {
    error.value = err;
    console.error('Error loading user settings:', err);
  } finally {
    loading.value = false;
  }
};

// Update theme setting
const updateThemeSetting = async () => {
  await saveSetting('theme', themeSettings, 'Theme preferences updated');
};

// Update notification setting
const updateNotificationSetting = async () => {
  await saveSetting('notifications', notificationSettings, 'Notification preferences updated');
};

// Update privacy setting
const updatePrivacySetting = async () => {
  await saveSetting('privacy', privacySettings, 'Privacy settings updated');
};

// Generic save setting function
const saveSetting = async (key: string, value: any, successMessage: string) => {
  try {
    saveStatus.value = null;

    const settingInput = {
      type: 'user',
      key,
      value,
      entityId: currentUser.value.userId,
      description: `User ${key} preferences`,
      isActive: true
    };

    if (settingIds[key]) {
      // Update existing setting
      await updateSetting({
        input: {
          id: settingIds[key],
          value
        }
      });
    } else {
      // Create new setting
      const result = await createSetting({
        input: settingInput
      });
      settingIds[key] = result.data.createSetting.id;
    }

    saveStatus.value = {
      type: 'success',
      message: successMessage
    };

    // Clear status after 3 seconds
    setTimeout(() => {
      saveStatus.value = null;
    }, 3000);

  } catch (err) {
    console.error(`Error saving ${key} setting:`, err);
    saveStatus.value = {
      type: 'error',
      message: `Failed to save ${key} settings`
    };
  }
};

// Initialize component
onMounted(() => {
  loadUserSettings();
});
</script>

<style scoped>
.user-settings {
  max-width: 800px;
  margin: 0 auto;
}
</style>
