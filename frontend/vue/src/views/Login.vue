<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Sign in to your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Or create a new account below
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <Authenticator :form-fields="formFields">
          <template v-slot="{ user, signOut }">
            <div class="text-center">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Welcome, {{ user.signInDetails?.loginId || user.username }}!
              </h3>
              <p class="text-sm text-gray-600 mb-4">
                You are successfully signed in.
              </p>
              <button
                @click="signOut"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Sign Out
              </button>
            </div>
          </template>
        </Authenticator>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Authenticator } from '@aws-amplify/ui-vue'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { fetchAuthSession } from '@aws-amplify/auth'

const router = useRouter()

// Custom form fields for sign up
const formFields = {
  signUp: {
    email: {
      order: 1,
      placeholder: 'Enter your email address',
      label: 'Email *',
      inputProps: { required: true },
    },
    given_name: {
      order: 2,
      placeholder: 'Enter your first name',
      label: 'First Name *',
      inputProps: { required: true },
    },
    family_name: {
      order: 3,
      placeholder: 'Enter your last name', 
      label: 'Last Name *',
      inputProps: { required: true },
    },
    password: {
      order: 4,
      placeholder: 'Enter your password',
      label: 'Password *',
      inputProps: { required: true },
    },
    confirm_password: {
      order: 5,
      placeholder: 'Confirm your password',
      label: 'Confirm Password *',
      inputProps: { required: true },
    },
  },
}

// Check if user is already authenticated
onMounted(async () => {
  try {
    const session = await fetchAuthSession()
    if (session.tokens?.accessToken) {
      router.push('/dashboard')
    }
  } catch (error) {
    // User is not authenticated, stay on login page
    console.log('User not authenticated')
  }
})
</script>

<style scoped>
/* Custom styles for the authenticator */
:deep(.amplify-authenticator) {
  --amplify-colors-brand-primary-60: rgb(37 99 235);
  --amplify-colors-brand-primary-80: rgb(29 78 216);
  --amplify-colors-brand-primary-90: rgb(30 64 175);
  --amplify-colors-brand-primary-100: rgb(30 58 138);
}
</style>
