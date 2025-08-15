<template>
  <div class="app-configuration">
    <div class="config-header">
      <h2>Application Configuration</h2>
      <div class="config-actions">
        <button @click="loadSettings" class="btn-secondary">Refresh</button>
        <button @click="saveAllSettings" class="btn-primary" :disabled="!hasChanges">
          Save Changes
        </button>
      </div>
    </div>

    <div class="config-sections">
      <div class="config-section">
        <h3>📊 Analytics & Logging</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Log Retention (Days)</label>
            <input 
              type="number" 
              v-model.number="settings.log_retention_days"
              @input="markChanged('log_retention_days')"
              min="1" 
              max="365"
              class="form-input"
            />
            <small>How long to keep analytics logs (1-365 days)</small>
          </div>

          <div class="setting-item">
            <label>Batch Log Interval (Seconds)</label>
            <input 
              type="number" 
              v-model.number="settings.batch_log_interval"
              @input="markChanged('batch_log_interval')"
              min="1" 
              max="60"
              class="form-input"
            />
            <small>How often to process log batches (1-60 seconds)</small>
          </div>

          <div class="setting-item">
            <label>Batch Log Size</label>
            <input 
              type="number" 
              v-model.number="settings.batch_log_size"
              @input="markChanged('batch_log_size')"
              min="10" 
              max="100"
              class="form-input"
            />
            <small>Maximum events per batch (10-100)</small>
          </div>

          <div class="setting-item">
            <label>Enable Error Tracking</label>
            <input 
              type="checkbox" 
              v-model="settings.enable_error_tracking"
              @change="markChanged('enable_error_tracking')"
              class="form-checkbox"
            />
            <small>Automatically track and log errors</small>
          </div>
        </div>
      </div>

      <div class="config-section">
        <h3>🔐 Security & Sessions</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Session Timeout (Minutes)</label>
            <input 
              type="number" 
              v-model.number="settings.session_timeout_minutes"
              @input="markChanged('session_timeout_minutes')"
              min="5" 
              max="480"
              class="form-input"
            />
            <small>User session timeout (5-480 minutes)</small>
          </div>

          <div class="setting-item">
            <label>Max Login Attempts</label>
            <input 
              type="number" 
              v-model.number="settings.max_login_attempts"
              @input="markChanged('max_login_attempts')"
              min="3" 
              max="10"
              class="form-input"
            />
            <small>Failed login attempts before lockout (3-10)</small>
          </div>

          <div class="setting-item">
            <label>Enable User Impersonation</label>
            <input 
              type="checkbox" 
              v-model="settings.enable_user_impersonation"
              @change="markChanged('enable_user_impersonation')"
              class="form-checkbox"
            />
            <small>Allow admin user impersonation</small>
          </div>
        </div>
      </div>

      <div class="config-section">
        <h3>🎨 User Interface</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Enable Timezone Detection</label>
            <input 
              type="checkbox" 
              v-model="settings.timezone_detection"
              @change="markChanged('timezone_detection')"
              class="form-checkbox"
            />
            <small>Auto-detect user timezone for datetime display</small>
          </div>

          <div class="setting-item">
            <label>Admin Dashboard Refresh (Seconds)</label>
            <input 
              type="number" 
              v-model.number="settings.admin_dashboard_refresh"
              @input="markChanged('admin_dashboard_refresh')"
              min="10" 
              max="300"
              class="form-input"
            />
            <small>Dashboard refresh interval (10-300 seconds)</small>
          </div>
        </div>
      </div>

      <div class="config-section">
        <h3>📤 Data Export</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>Export Max Records</label>
            <input 
              type="number" 
              v-model.number="settings.export_max_records"
              @input="markChanged('export_max_records')"
              min="1000" 
              max="100000"
              step="1000"
              class="form-input"
            />
            <small>Maximum records for CSV/JSON export (1K-100K)</small>
          </div>
        </div>
      </div>
    </div>

    <div class="config-footer">
      <div class="changes-indicator" v-if="hasChanges">
        <span class="changes-badge">{{ changedSettings.length }} unsaved changes</span>
        <button @click="resetChanges" class="btn-link">Reset</button>
      </div>
      
      <div class="last-updated" v-if="lastUpdated">
        Last updated: {{ formatTimestamp(lastUpdated) }}
      </div>
    </div>

    <!-- Settings History Modal -->
    <div v-if="showHistoryModal" class="modal-overlay" @click="showHistoryModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Settings History</h3>
          <button @click="showHistoryModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="history-list">
            <div v-for="change in settingsHistory" :key="change.id" class="history-item">
              <div class="history-header">
                <strong>{{ change.key }}</strong>
                <span class="history-date">{{ formatTimestamp(change.updatedAt) }}</span>
              </div>
              <div class="history-change">
                <span class="old-value">{{ JSON.stringify(change.oldValue) }}</span>
                <span class="arrow">→</span>
                <span class="new-value">{{ JSON.stringify(change.newValue) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAnalytics } from '../../services/analytics';
import { apolloClient } from '../../graphql/client';
import { gql } from '@apollo/client/core';

const { trackAction, trackError } = useAnalytics('app-configuration');

const settings = ref({
  log_retention_days: 90,
  batch_log_interval: 5,
  batch_log_size: 50,
  enable_error_tracking: true,
  session_timeout_minutes: 60,
  max_login_attempts: 5,
  enable_user_impersonation: true,
  timezone_detection: true,
  admin_dashboard_refresh: 30,
  export_max_records: 10000
});

const originalSettings = ref({});
const changedSettings = ref([]);
const lastUpdated = ref(null);
const showHistoryModal = ref(false);
const settingsHistory = ref([]);

const SYSTEM_SETTINGS_QUERY = gql`
  query GetSystemSettings {
    listSettings(filter: { type: { eq: "SYSTEM" }, entityId: { eq: "GLOBAL" } }) {
      id
      key
      value
      isActive
      updatedAt
    }
  }
`;

const UPDATE_SETTING_MUTATION = gql`
  mutation UpdateSetting($input: UpdateSettingInput!) {
    updateSetting(input: $input) {
      id
      key
      value
      updatedAt
    }
  }
`;

const hasChanges = computed(() => {
  return changedSettings.value.length > 0;
});

onMounted(async () => {
  await loadSettings();
  trackAction('configuration-loaded');
});

const loadSettings = async () => {
  try {
    const result = await apolloClient.query({
      query: SYSTEM_SETTINGS_QUERY,
      fetchPolicy: 'network-only'
    });

    const systemSettings = result.data.listSettings || [];
    
    // Map settings to local state
    systemSettings.forEach((setting: any) => {
      if (!setting.isActive) return;
      
      const key = setting.key;
      const value = setting.value;
      
      // Extract the actual value from the nested object
      if (key === 'log_retention_days') {
        settings.value.log_retention_days = value.days || 90;
      } else if (key === 'batch_log_interval') {
        settings.value.batch_log_interval = value.seconds || 5;
      } else if (key === 'batch_log_size') {
        settings.value.batch_log_size = value.count || 50;
      } else if (key === 'enable_error_tracking') {
        settings.value.enable_error_tracking = value.enabled !== false;
      } else if (key === 'session_timeout_minutes') {
        settings.value.session_timeout_minutes = value.minutes || 60;
      } else if (key === 'max_login_attempts') {
        settings.value.max_login_attempts = value.attempts || 5;
      } else if (key === 'enable_user_impersonation') {
        settings.value.enable_user_impersonation = value.enabled !== false;
      } else if (key === 'timezone_detection') {
        settings.value.timezone_detection = value.enabled !== false;
      } else if (key === 'admin_dashboard_refresh') {
        settings.value.admin_dashboard_refresh = value.seconds || 30;
      } else if (key === 'export_max_records') {
        settings.value.export_max_records = value.count || 10000;
      }
      
      if (setting.updatedAt && (!lastUpdated.value || setting.updatedAt > lastUpdated.value)) {
        lastUpdated.value = setting.updatedAt;
      }
    });

    // Store original values
    originalSettings.value = { ...settings.value };
    changedSettings.value = [];

    trackAction('settings-loaded', { count: systemSettings.length });
  } catch (error) {
    trackError('failed-to-load-settings', { error: error.message });
  }
};

const markChanged = (key: string) => {
  if (!changedSettings.value.includes(key)) {
    changedSettings.value.push(key);
  }
  trackAction('setting-changed', { key });
};

const saveAllSettings = async () => {
  try {
    const updates = [];
    
    for (const key of changedSettings.value) {
      const value = settings.value[key];
      let settingValue;
      
      // Format value according to the setting type
      if (key === 'log_retention_days') {
        settingValue = { days: value };
      } else if (key === 'batch_log_interval') {
        settingValue = { seconds: value };
      } else if (key === 'batch_log_size') {
        settingValue = { count: value };
      } else if (key === 'enable_error_tracking') {
        settingValue = { enabled: value };
      } else if (key === 'session_timeout_minutes') {
        settingValue = { minutes: value };
      } else if (key === 'max_login_attempts') {
        settingValue = { attempts: value };
      } else if (key === 'enable_user_impersonation') {
        settingValue = { enabled: value };
      } else if (key === 'timezone_detection') {
        settingValue = { enabled: value };
      } else if (key === 'admin_dashboard_refresh') {
        settingValue = { seconds: value };
      } else if (key === 'export_max_records') {
        settingValue = { count: value };
      }

      updates.push({
        key,
        value: settingValue,
        oldValue: originalSettings.value[key]
      });
    }

    // Save each setting
    for (const update of updates) {
      await apolloClient.mutate({
        mutation: UPDATE_SETTING_MUTATION,
        variables: {
          input: {
            id: `system-${update.key.replace(/_/g, '-')}`,
            type: 'SYSTEM',
            key: update.key,
            value: update.value,
            entityId: 'GLOBAL',
            isActive: true
          }
        }
      });
    }

    // Update original settings and clear changes
    originalSettings.value = { ...settings.value };
    changedSettings.value = [];
    lastUpdated.value = new Date().toISOString();

    trackAction('settings-saved', { 
      count: updates.length,
      keys: updates.map(u => u.key)
    });

    // Show success message
    alert('Settings saved successfully!');
  } catch (error) {
    trackError('failed-to-save-settings', { error: error.message });
    alert('Failed to save settings. Please try again.');
  }
};

const resetChanges = () => {
  settings.value = { ...originalSettings.value };
  changedSettings.value = [];
  trackAction('settings-reset');
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.app-configuration {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.config-actions {
  display: flex;
  gap: 1rem;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.config-section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-item label {
  font-weight: 600;
  color: #333;
}

.form-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-checkbox {
  width: auto;
  margin-right: 0.5rem;
}

.setting-item small {
  color: #666;
  font-size: 0.75rem;
  line-height: 1.4;
}

.config-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.changes-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.changes-badge {
  background: #ffc107;
  color: #212529;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
}

.last-updated {
  color: #666;
  font-size: 0.875rem;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.history-date {
  color: #666;
  font-size: 0.875rem;
}

.history-change {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.old-value {
  color: #dc3545;
}

.new-value {
  color: #28a745;
}

.arrow {
  color: #666;
}
</style>