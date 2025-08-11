<template>
  <div class="post-settings">
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-900">Post Settings</h2>
        <span class="text-sm text-gray-500">Post ID: {{ postId }}</span>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading post settings</h3>
            <div class="mt-2 text-sm text-red-700">{{ error.message }}</div>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div v-if="!loading" class="space-y-6">
        <!-- Visibility Settings -->
        <div class="border-b border-gray-200 pb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Visibility & Access</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Public Post</label>
                <p class="text-sm text-gray-500">Make this post visible to everyone</p>
              </div>
              <input 
                type="checkbox" 
                v-model="visibilitySettings.isPublic" 
                @change="updateVisibilitySetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Allow Comments</label>
                <p class="text-sm text-gray-500">Let users comment on this post</p>
              </div>
              <input 
                type="checkbox" 
                v-model="visibilitySettings.allowComments" 
                @change="updateVisibilitySetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Allow Sharing</label>
                <p class="text-sm text-gray-500">Allow users to share this post</p>
              </div>
              <input 
                type="checkbox" 
                v-model="visibilitySettings.allowSharing" 
                @change="updateVisibilitySetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Moderation Level</label>
              <select 
                v-model="visibilitySettings.moderationLevel" 
                @change="updateVisibilitySetting"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">No Moderation</option>
                <option value="auto">Auto Moderation</option>
                <option value="manual">Manual Review</option>
                <option value="strict">Strict Filtering</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Formatting Settings -->
        <div class="border-b border-gray-200 pb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Content & Formatting</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Allow Markdown</label>
                <p class="text-sm text-gray-500">Enable markdown formatting in content</p>
              </div>
              <input 
                type="checkbox" 
                v-model="formattingSettings.allowMarkdown" 
                @change="updateFormattingSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Auto-link URLs</label>
                <p class="text-sm text-gray-500">Automatically convert URLs to links</p>
              </div>
              <input 
                type="checkbox" 
                v-model="formattingSettings.autoLinkUrls" 
                @change="updateFormattingSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Allow Images</label>
                <p class="text-sm text-gray-500">Allow image uploads in content</p>
              </div>
              <input 
                type="checkbox" 
                v-model="formattingSettings.allowImages" 
                @change="updateFormattingSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Maximum Content Length</label>
              <input 
                type="number" 
                v-model="formattingSettings.maxLength" 
                @change="updateFormattingSetting"
                min="100" 
                max="50000"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- SEO Settings -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">SEO & Discovery</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Search Engine Indexing</label>
                <p class="text-sm text-gray-500">Allow search engines to index this post</p>
              </div>
              <input 
                type="checkbox" 
                v-model="seoSettings.allowIndexing" 
                @change="updateSeoSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Generate Meta Tags</label>
                <p class="text-sm text-gray-500">Auto-generate meta description and tags</p>
              </div>
              <input 
                type="checkbox" 
                v-model="seoSettings.generateMetaTags" 
                @change="updateSeoSetting"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-900">Social Media Preview</label>
                <p class="text-sm text-gray-500">Generate preview for social media sharing</p>
              </div>
              <input 
                type="checkbox" 
                v-model="seoSettings.socialPreview" 
                @change="updateSeoSetting"
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
import { ref, reactive, onMounted, watch } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { GET_POST_SETTINGS, CREATE_SETTING, UPDATE_SETTING } from '../graphql/settings';

// Props
const props = defineProps<{
  postId: string;
}>();

// Reactive data
const loading = ref(true);
const error = ref(null);
const saveStatus = ref(null);

// Settings data
const visibilitySettings = reactive({
  isPublic: true,
  allowComments: true,
  allowSharing: true,
  moderationLevel: 'auto'
});

const formattingSettings = reactive({
  allowMarkdown: true,
  autoLinkUrls: true,
  allowImages: true,
  maxLength: 5000
});

const seoSettings = reactive({
  allowIndexing: true,
  generateMetaTags: true,
  socialPreview: true
});

// Store setting IDs for updates
const settingIds = reactive({
  visibility: null,
  formatting: null,
  seo: null
});

// GraphQL mutations
const { mutate: createSetting } = useMutation(CREATE_SETTING);
const { mutate: updateSetting } = useMutation(UPDATE_SETTING);

// Load post settings
const loadPostSettings = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Query post settings
    const { result } = await useQuery(GET_POST_SETTINGS, {
      entityId: props.postId
    });

    if (result.value?.listSettings?.items) {
      const settings = result.value.listSettings.items;
      
      // Process each setting
      settings.forEach(setting => {
        if (setting.key === 'visibility') {
          Object.assign(visibilitySettings, setting.value);
          settingIds.visibility = setting.id;
        } else if (setting.key === 'formatting') {
          Object.assign(formattingSettings, setting.value);
          settingIds.formatting = setting.id;
        } else if (setting.key === 'seo') {
          Object.assign(seoSettings, setting.value);
          settingIds.seo = setting.id;
        }
      });
    }
  } catch (err) {
    error.value = err;
    console.error('Error loading post settings:', err);
  } finally {
    loading.value = false;
  }
};

// Update visibility setting
const updateVisibilitySetting = async () => {
  await saveSetting('visibility', visibilitySettings, 'Visibility settings updated');
};

// Update formatting setting
const updateFormattingSetting = async () => {
  await saveSetting('formatting', formattingSettings, 'Formatting settings updated');
};

// Update SEO setting
const updateSeoSetting = async () => {
  await saveSetting('seo', seoSettings, 'SEO settings updated');
};

// Generic save setting function
const saveSetting = async (key: string, value: any, successMessage: string) => {
  try {
    saveStatus.value = null;

    const settingInput = {
      type: 'post',
      key,
      value,
      entityId: props.postId,
      description: `Post ${key} settings`,
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

// Watch for postId changes
watch(() => props.postId, () => {
  if (props.postId) {
    loadPostSettings();
  }
});

// Initialize component
onMounted(() => {
  if (props.postId) {
    loadPostSettings();
  }
});
</script>

<style scoped>
.post-settings {
  max-width: 600px;
}
</style>
