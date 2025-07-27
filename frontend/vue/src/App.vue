<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading application...</p>
      </div>
    </div>
    
    <div v-else>
      <Navbar v-if="!isLoginPage" />
      <main :class="{ 'ml-64': !isLoginPage && !isMobile, 'pt-16': !isLoginPage }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()
const router = useRouter()
const isMobile = ref(false)
const loading = ref(true)

const isLoginPage = computed(() => route.path === '/login')

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(async () => {
  console.log('App mounted, current route:', route.path)
  
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Add a small delay to ensure everything is initialized
  setTimeout(() => {
    loading.value = false
    console.log('App loading complete')
  }, 1000)
})
</script>
