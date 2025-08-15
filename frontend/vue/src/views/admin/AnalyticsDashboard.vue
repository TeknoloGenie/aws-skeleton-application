<template>
  <div class="analytics-dashboard">
    <div class="dashboard-controls">
      <div class="filters">
        <input 
          v-model="filters.search" 
          placeholder="Search logs..." 
          class="search-input"
          @input="trackAction('search-logs')"
        />
        
        <select v-model="filters.component" @change="trackAction('filter-component')">
          <option value="">All Components</option>
          <option v-for="component in uniqueComponents" :key="component" :value="component">
            {{ component }}
          </option>
        </select>

        <select v-model="filters.action" @change="trackAction('filter-action')">
          <option value="">All Actions</option>
          <option v-for="action in uniqueActions" :key="action" :value="action">
            {{ action }}
          </option>
        </select>

        <select v-model="filters.level" @change="trackAction('filter-level')">
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>

        <input 
          v-model="filters.dateFrom" 
          type="datetime-local" 
          class="date-input"
          @change="trackAction('filter-date-from')"
        />
        
        <input 
          v-model="filters.dateTo" 
          type="datetime-local" 
          class="date-input"
          @change="trackAction('filter-date-to')"
        />

        <button @click="clearFilters" class="btn-secondary">Clear Filters</button>
        <button @click="exportLogs" class="btn-primary">Export CSV</button>
      </div>
    </div>

    <div class="analytics-content">
      <div class="charts-section">
        <div class="chart-container">
          <h3>Activity Timeline</h3>
          <canvas ref="timelineChart"></canvas>
        </div>
        
        <div class="chart-container">
          <h3>Action Distribution</h3>
          <canvas ref="actionChart"></canvas>
        </div>
        
        <div class="chart-container">
          <h3>Component Usage</h3>
          <canvas ref="componentChart"></canvas>
        </div>
        
        <div class="chart-container">
          <h3>Error Rates</h3>
          <canvas ref="errorChart"></canvas>
        </div>
      </div>

      <div class="logs-section">
        <div class="logs-header">
          <h3>Raw Logs ({{ filteredLogs.length }})</h3>
          <div class="pagination">
            <button 
              @click="currentPage--" 
              :disabled="currentPage <= 1"
              class="btn-secondary"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button 
              @click="currentPage++" 
              :disabled="currentPage >= totalPages"
              class="btn-secondary"
            >
              Next
            </button>
          </div>
        </div>

        <div class="logs-table">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Component</th>
                <th>Action</th>
                <th>Level</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in paginatedLogs" :key="log.id" :class="['log-row', log.level]">
                <td>{{ formatTimestamp(log.createdAt) }}</td>
                <td>{{ log.user?.name || log.userId }}</td>
                <td>{{ log.component }}</td>
                <td>{{ log.action }}</td>
                <td>
                  <span :class="['level-badge', log.level]">{{ log.level }}</span>
                </td>
                <td>
                  <details v-if="log.metadata">
                    <summary>View</summary>
                    <pre>{{ JSON.stringify(log.metadata, null, 2) }}</pre>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAnalytics } from '../../services/analytics';
import { apolloClient } from '../../graphql/client';
import { gql } from '@apollo/client/core';

const { trackAction, trackError } = useAnalytics('analytics-dashboard');

const logs = ref([]);
const filters = ref({
  search: '',
  component: '',
  action: '',
  level: '',
  dateFrom: '',
  dateTo: ''
});

const currentPage = ref(1);
const pageSize = 50;
const subscription = ref(null);

// Charts
const timelineChart = ref(null);
const actionChart = ref(null);
const componentChart = ref(null);
const errorChart = ref(null);

const LOGS_QUERY = gql`
  query GetLogs($limit: Int, $nextToken: String) {
    listLogs(limit: $limit, nextToken: $nextToken) {
      items {
        id
        userId
        action
        component
        level
        metadata
        createdAt
        user {
          id
          name
          email
        }
      }
      nextToken
    }
  }
`;

const LOGS_SUBSCRIPTION = gql`
  subscription OnLogCreated {
    onCreateLog {
      id
      userId
      action
      component
      level
      metadata
      createdAt
      user {
        id
        name
        email
      }
    }
  }
`;

const filteredLogs = computed(() => {
  let filtered = logs.value;

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    filtered = filtered.filter(log => 
      log.component.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.user?.name?.toLowerCase().includes(search)
    );
  }

  if (filters.value.component) {
    filtered = filtered.filter(log => log.component === filters.value.component);
  }

  if (filters.value.action) {
    filtered = filtered.filter(log => log.action === filters.value.action);
  }

  if (filters.value.level) {
    filtered = filtered.filter(log => log.level === filters.value.level);
  }

  if (filters.value.dateFrom) {
    const fromDate = new Date(filters.value.dateFrom);
    filtered = filtered.filter(log => new Date(log.createdAt) >= fromDate);
  }

  if (filters.value.dateTo) {
    const toDate = new Date(filters.value.dateTo);
    filtered = filtered.filter(log => new Date(log.createdAt) <= toDate);
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredLogs.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / pageSize);
});

const uniqueComponents = computed(() => {
  return [...new Set(logs.value.map(log => log.component))].sort();
});

const uniqueActions = computed(() => {
  return [...new Set(logs.value.map(log => log.action))].sort();
});

onMounted(async () => {
  await loadLogs();
  setupSubscription();
  initializeCharts();
});

onUnmounted(() => {
  if (subscription.value) {
    subscription.value.unsubscribe();
  }
});

watch(filteredLogs, () => {
  updateCharts();
}, { deep: true });

const loadLogs = async () => {
  try {
    const result = await apolloClient.query({
      query: LOGS_QUERY,
      variables: { limit: 1000 },
      fetchPolicy: 'network-only'
    });
    
    logs.value = result.data.listLogs.items;
    trackAction('logs-loaded', { count: logs.value.length });
  } catch (error) {
    trackError('failed-to-load-logs', { error: error.message });
  }
};

const setupSubscription = () => {
  try {
    subscription.value = apolloClient.subscribe({
      query: LOGS_SUBSCRIPTION
    }).subscribe({
      next: ({ data }) => {
        logs.value.unshift(data.onCreateLog);
        trackAction('real-time-log-received');
      },
      error: (error) => {
        trackError('subscription-error', { error: error.message });
      }
    });
  } catch (error) {
    trackError('failed-to-setup-subscription', { error: error.message });
  }
};

const clearFilters = () => {
  filters.value = {
    search: '',
    component: '',
    action: '',
    level: '',
    dateFrom: '',
    dateTo: ''
  };
  currentPage.value = 1;
  trackAction('filters-cleared');
};

const exportLogs = () => {
  try {
    const csvData = filteredLogs.value.map(log => ({
      timestamp: log.createdAt,
      user: log.user?.name || log.userId,
      component: log.component,
      action: log.action,
      level: log.level,
      metadata: JSON.stringify(log.metadata || {})
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    trackAction('logs-exported', { count: csvData.length });
  } catch (error) {
    trackError('export-failed', { error: error.message });
  }
};

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const initializeCharts = () => {
  // Chart initialization would go here
  // Using Chart.js or similar library
  trackAction('charts-initialized');
};

const updateCharts = () => {
  // Chart update logic would go here
  trackAction('charts-updated');
};
</script>

<style scoped>
.analytics-dashboard {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}

.dashboard-controls {
  margin-bottom: 2rem;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input, .date-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.logs-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 2rem;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logs-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

th {
  background: #f5f5f5;
  font-weight: 600;
}

.log-row.error {
  background: #fef2f2;
}

.log-row.warn {
  background: #fffbeb;
}

.level-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.level-badge.info {
  background: #dbeafe;
  color: #1e40af;
}

.level-badge.warn {
  background: #fef3c7;
  color: #92400e;
}

.level-badge.error {
  background: #fecaca;
  color: #dc2626;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

details summary {
  cursor: pointer;
  color: #007bff;
}

details pre {
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  max-width: 300px;
  overflow-x: auto;
}
</style>