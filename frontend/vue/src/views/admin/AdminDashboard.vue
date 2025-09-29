<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Admin Dashboard</h1>
      <div class="user-info">
        <span>{{ currentUser?.name }}</span>
        <button @click="signOut" class="btn-secondary">Sign Out</button>
      </div>
    </div>

    <div class="dashboard-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="dashboard-content">
      <AnalyticsDashboard v-if="activeTab === 'analytics'" />
      <DataManagement v-if="activeTab === 'data'" />
      <AppConfiguration v-if="activeTab === 'config'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAnalytics } from '../../services/analytics';
import { getCurrentUser, signOut as authSignOut } from '../../graphql/client';
import AnalyticsDashboard from './AnalyticsDashboard.vue';
import DataManagement from './DataManagement.vue';
import AppConfiguration from './AppConfiguration.vue';

const { trackAction, trackError } = useAnalytics('admin-dashboard');

const activeTab = ref('analytics');
const currentUser = ref<any>(null);

const tabs = [
  { id: 'analytics', label: '📊 Analytics' },
  { id: 'data', label: '🗃️ Data Management' },
  { id: 'config', label: '⚙️ Configuration' }
];

onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser();
    trackAction('dashboard-loaded');
  } catch (error) {
    trackError('failed-to-load-user', { error: error.message });
  }
});

const signOut = async () => {
  try {
    trackAction('admin-signout');
    await authSignOut();
  } catch (error) {
    trackError('signout-failed', { error: error.message });
  }
};
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background: #f5f5f5;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.dashboard-header h1 {
  margin: 0;
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dashboard-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.tab-button {
  padding: 1rem 2rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #f0f0f0;
}

.tab-button.active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.dashboard-content {
  padding: 2rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #f0f0f0;
}
</style>