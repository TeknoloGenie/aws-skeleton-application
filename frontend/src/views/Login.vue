<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Or
        <a href="#" class="font-medium text-primary-600 hover:text-primary-500">
          create a new account
        </a>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <amplify-authenticator>
          <template v-slot="{ user, signOut }">
            <div class="text-center">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Welcome, {{ user.attributes?.name || user.username }}!
              </h3>
              <p class="text-sm text-gray-600 mb-6">
                You are successfully signed in.
              </p>
              <div class="space-y-3">
                <router-link
                  to="/dashboard"
                  class="w-full btn-primary block text-center"
                >
                  Go to Dashboard
                </router-link>
                <button
                  @click="signOut"
                  class="w-full btn-secondary"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </template>
        </amplify-authenticator>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AmplifyAuthenticator from '@aws-amplify/ui-vue'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { Auth } from 'aws-amplify'

const router = useRouter()

// Check if user is already authenticated
onMounted(async () => {
  try {
    await Auth.currentAuthenticatedUser()
    router.push('/dashboard')
  } catch (error) {
    // User not authenticated, stay on login page
  }
})
</script>
