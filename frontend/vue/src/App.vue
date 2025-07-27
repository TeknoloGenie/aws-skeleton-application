<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <Navbar v-if="!isLoginPage" />
    <main :class="{ 'ml-64': !isLoginPage && !isMobile, 'pt-16': !isLoginPage }">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()
const isMobile = ref(false)

const isLoginPage = computed(() => route.path === '/login')

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
</script>
