<template>
  <div class="p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Users</h1>
      <p class="text-gray-600 mt-2">Manage Cognito users and their application profiles</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error loading users</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="ml-3 text-gray-600">Loading users...</p>
    </div>

    <!-- Users Table -->
    <div v-else class="card">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900">All Users ({{ cognitoUsers.length }})</h2>
        <button class="btn-primary" @click="refreshUsers" :disabled="loading">
          <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="cognitoUsers.length === 0" class="text-center py-12">
        <div class="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No users found</h3>
        <p class="mt-1 text-sm text-gray-500">No Cognito users are currently registered.</p>
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
                Status
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
            <tr v-for="cognitoUser in cognitoUsers" :key="cognitoUser.Username">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-medium">
                      {{ getUserInitials(cognitoUser) }}
                    </span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ getUserDisplayName(cognitoUser) }}
                    </div>
                    <div class="text-sm text-gray-500">
                      ID: {{ cognitoUser.Username }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getUserEmail(cognitoUser) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(cognitoUser)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ cognitoUser.UserStatus }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatDate(cognitoUser.UserCreateDate) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  v-if="!hasUserRecord(cognitoUser.Username)"
                  @click="openProvisionDialog(cognitoUser)"
                  class="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors mr-2"
                >
                  Provision
                </button>
                <button
                  v-else
                  @click="openEditDialog(cognitoUser)"
                  class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors mr-2"
                >
                  Edit
                </button>
                <button
                  @click="viewUserDetails(cognitoUser)"
                  class="text-blue-600 hover:text-blue-900 ml-2"
                >
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Provision/Edit Dialog -->
    <div v-if="showDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ isEditing ? 'Edit User Profile' : 'Provision User Profile' }}
          </h3>
          
          <form @submit.prevent="submitUserForm">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                v-model="userForm.name"
                type="text"
                required
                class="input-field"
                placeholder="Enter full name"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                v-model="userForm.email"
                type="email"
                required
                :disabled="isEditing"
                class="input-field"
                :class="{ 'bg-gray-100': isEditing }"
                placeholder="Enter email address"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                v-model="userForm.bio"
                rows="3"
                class="input-field"
                placeholder="Enter user bio (optional)"
              ></textarea>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select v-model="userForm.role" class="input-field">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="closeDialog"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {{ submitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { fetchAuthSession } from '@aws-amplify/auth'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { listUsers, createUser, updateUser } from '../graphql/queries'

interface CognitoUser {
  Username: string
  UserStatus: string
  UserCreateDate: string
  Attributes: Array<{ Name: string; Value: string }>
}

interface UserRecord {
  id: string
  name: string
  email: string
  bio?: string
  role: string
  cognitoId: string
  createdAt: string
  updatedAt: string
}

interface UserForm {
  name: string
  email: string
  bio: string
  role: string
}

const cognitoUsers = ref<CognitoUser[]>([])
const loading = ref(true)
const error = ref('')
const showDialog = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const selectedCognitoUser = ref<CognitoUser | null>(null)

const userForm = ref<UserForm>({
  name: '',
  email: '',
  bio: '',
  role: 'user'
})

// Apollo composables
const { result: userRecordsResult, refetch: refetchUserRecords } = useQuery(listUsers, {}, {
  fetchPolicy: 'network-only'
})

const { mutate: createUserMutation } = useMutation(createUser)
const { mutate: updateUserMutation } = useMutation(updateUser)

const userRecords = computed(() => userRecordsResult.value?.listUsers || [])

onMounted(() => {
  loadUsers()
})

const loadUsers = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Load both Cognito users and User records in parallel
    await Promise.all([
      loadCognitoUsers(),
      refetchUserRecords()
    ])
  } catch (err: any) {
    error.value = err.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

const loadCognitoUsers = async () => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.accessToken?.toString()
    
    if (!token) {
      throw new Error('No authentication token available')
    }

    // Get admin API URL from aws-exports
    let adminApiUrl = ''
    try {
      const awsExports = (await import('../aws-exports.js')).default
      adminApiUrl = awsExports.aws_admin_api_endpoint || ''
    } catch (error) {
      console.warn('Could not load aws-exports, using relative URL')
    }

    const apiUrl = adminApiUrl ? `${adminApiUrl}api/admin/cognito/users` : '/api/admin/cognito/users'

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Cognito users: ${response.statusText}`)
    }

    const data = await response.json()
    cognitoUsers.value = data.users || []
  } catch (err: any) {
    console.error('Error loading Cognito users:', err)
    throw new Error(`Failed to load Cognito users: ${err.message}`)
  }
}

const refreshUsers = () => {
  loadUsers()
}

const getUserInitials = (cognitoUser: CognitoUser): string => {
  const givenName = cognitoUser.Attributes.find(attr => attr.Name === 'given_name')?.Value || ''
  const familyName = cognitoUser.Attributes.find(attr => attr.Name === 'family_name')?.Value || ''
  const email = cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || ''
  
  if (givenName && familyName) {
    return (givenName.charAt(0) + familyName.charAt(0)).toUpperCase()
  }
  
  return email.charAt(0).toUpperCase()
}

const getUserDisplayName = (cognitoUser: CognitoUser): string => {
  const givenName = cognitoUser.Attributes.find(attr => attr.Name === 'given_name')?.Value || ''
  const familyName = cognitoUser.Attributes.find(attr => attr.Name === 'family_name')?.Value || ''
  
  if (givenName && familyName) {
    return `${givenName} ${familyName}`
  }
  
  return cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || cognitoUser.Username
}

const getUserEmail = (cognitoUser: CognitoUser): string => {
  return cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value || ''
}

const getStatusBadgeClass = (cognitoUser: CognitoUser): string => {
  switch (cognitoUser.UserStatus) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800'
    case 'UNCONFIRMED':
      return 'bg-yellow-100 text-yellow-800'
    case 'FORCE_CHANGE_PASSWORD':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const hasUserRecord = (cognitoId: string): boolean => {
  return userRecords.value.some(record => record.cognitoId === cognitoId)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const openProvisionDialog = (cognitoUser: CognitoUser) => {
  selectedCognitoUser.value = cognitoUser
  isEditing.value = false
  userForm.value = {
    name: getUserDisplayName(cognitoUser),
    email: getUserEmail(cognitoUser),
    bio: '',
    role: 'user'
  }
  showDialog.value = true
}

const openEditDialog = (cognitoUser: CognitoUser) => {
  selectedCognitoUser.value = cognitoUser
  isEditing.value = true
  
  const existingRecord = userRecords.value.find(record => record.cognitoId === cognitoUser.Username)
  if (existingRecord) {
    userForm.value = {
      name: existingRecord.name,
      email: existingRecord.email,
      bio: existingRecord.bio || '',
      role: existingRecord.role
    }
  }
  
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  selectedCognitoUser.value = null
  userForm.value = {
    name: '',
    email: '',
    bio: '',
    role: 'user'
  }
}

const submitUserForm = async () => {
  if (!selectedCognitoUser.value) return
  
  submitting.value = true
  
  try {
    if (isEditing.value) {
      // Update existing User record via GraphQL mutation
      const existingRecord = userRecords.value.find(record => record.cognitoId === selectedCognitoUser.value!.Username)
      if (existingRecord) {
        await updateUserMutation({
          input: {
            id: existingRecord.id,
            name: userForm.value.name,
            bio: userForm.value.bio,
            role: userForm.value.role
          }
        })
      }
    } else {
      // Create new User record via GraphQL mutation
      await createUserMutation({
        input: {
          name: userForm.value.name,
          email: userForm.value.email,
          bio: userForm.value.bio,
          role: userForm.value.role,
          cognitoId: selectedCognitoUser.value.Username
        }
      })
    }
    
    // Refetch user records to update the UI
    await refetchUserRecords()
    closeDialog()
  } catch (err: any) {
    error.value = err.message || 'Failed to save user record'
  } finally {
    submitting.value = false
  }
}

const viewUserDetails = (cognitoUser: CognitoUser) => {
  console.log('View user details:', cognitoUser)
  // TODO: Navigate to user detail page or show detailed modal
}
</script>
