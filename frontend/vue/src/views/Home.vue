<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
    <div class="container mx-auto px-4 py-16">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          AWS Application Accelerator
        </h1>
        <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          A model-driven framework for rapidly building and deploying scalable AWS applications
          with GraphQL APIs, authentication, and CI/CD pipelines.
        </p>
        
        <div class="flex justify-center space-x-4">
          <router-link
            to="/dashboard"
            class="btn-primary text-lg px-8 py-3"
          >
            Get Started
          </router-link>
          <a
            href="https://github.com/your-org/aws-application-accelerator"
            target="_blank"
            class="btn-secondary text-lg px-8 py-3"
          >
            View on GitHub
          </a>
        </div>
      </div>
      
      <div class="mt-20 grid md:grid-cols-3 gap-8">
        <div class="card text-center">
          <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Model-Driven</h3>
          <p class="text-gray-600">
            Define your data models in JSON and automatically generate GraphQL APIs,
            database schemas, and resolvers.
          </p>
        </div>
        
        <div class="card text-center">
          <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Production Ready</h3>
          <p class="text-gray-600">
            Built-in authentication, monitoring, CI/CD pipelines, and security best practices
            for enterprise applications.
          </p>
        </div>
        
        <div class="card text-center">
          <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Developer Friendly</h3>
          <p class="text-gray-600">
            Modern Vue.js frontend, TypeScript support, and comprehensive documentation
            to get you started quickly.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home page component
</script>
