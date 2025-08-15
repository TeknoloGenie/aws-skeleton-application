<template>
  <div class="data-management">
    <div class="management-header">
      <h2>Data Management</h2>
      <div class="model-selector">
        <select v-model="selectedModel" @change="loadModelData">
          <option value="">Select Model</option>
          <option v-for="model in availableModels" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
        <button @click="refreshData" class="btn-secondary">Refresh</button>
        <button @click="exportData" class="btn-primary" :disabled="!selectedModel">
          Export {{ exportFormat }}
        </button>
        <select v-model="exportFormat">
          <option value="CSV">CSV</option>
          <option value="JSON">JSON</option>
        </select>
      </div>
    </div>

    <div v-if="selectedModel" class="model-management">
      <div class="actions-bar">
        <button @click="showCreateModal = true" class="btn-primary">
          Create New {{ selectedModel }}
        </button>
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            placeholder="Search records..." 
            class="search-input"
          />
        </div>
        <div class="bulk-actions">
          <button 
            @click="bulkDelete" 
            :disabled="selectedRecords.length === 0"
            class="btn-danger"
          >
            Delete Selected ({{ selectedRecords.length }})
          </button>
        </div>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  @change="toggleSelectAll"
                  :checked="allSelected"
                />
              </th>
              <th v-for="field in modelFields" :key="field" @click="sortBy(field)">
                {{ field }}
                <span v-if="sortField === field">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in paginatedRecords" :key="record.id">
              <td>
                <input 
                  type="checkbox" 
                  :value="record.id"
                  v-model="selectedRecords"
                />
              </td>
              <td v-for="field in modelFields" :key="field">
                <div v-if="field.includes('At')" class="timestamp">
                  {{ formatTimestamp(record[field]) }}
                </div>
                <div v-else-if="typeof record[field] === 'object'">
                  <details>
                    <summary>Object</summary>
                    <pre>{{ JSON.stringify(record[field], null, 2) }}</pre>
                  </details>
                </div>
                <div v-else>
                  {{ record[field] }}
                </div>
              </td>
              <td class="actions">
                <button @click="editRecord(record)" class="btn-sm btn-secondary">
                  Edit
                </button>
                <button @click="deleteRecord(record)" class="btn-sm btn-danger">
                  Delete
                </button>
                <button 
                  v-if="selectedModel === 'User'" 
                  @click="impersonateUser(record)"
                  class="btn-sm btn-warning"
                >
                  Impersonate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
        <select v-model="pageSize" @change="currentPage = 1">
          <option value="10">10 per page</option>
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showCreateModal ? 'Create' : 'Edit' }} {{ selectedModel }}</h3>
          <button @click="closeModals" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveRecord">
            <div v-for="field in editableFields" :key="field" class="form-group">
              <label>{{ field }}</label>
              <input 
                v-if="field.includes('At')"
                type="datetime-local"
                v-model="formData[field]"
                class="form-input"
              />
              <textarea 
                v-else-if="field === 'metadata' || typeof formData[field] === 'object'"
                v-model="formData[field]"
                class="form-textarea"
                rows="4"
              ></textarea>
              <input 
                v-else
                type="text"
                v-model="formData[field]"
                class="form-input"
                :required="requiredFields.includes(field)"
              />
            </div>
            <div class="form-actions">
              <button type="button" @click="closeModals" class="btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                {{ showCreateModal ? 'Create' : 'Update' }}
              </button>
            </div>
          </form>
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

const { trackAction, trackError } = useAnalytics('data-management');

const availableModels = ['User', 'Post', 'Setting', 'Log'];
const selectedModel = ref('');
const modelData = ref([]);
const searchQuery = ref('');
const selectedRecords = ref([]);
const sortField = ref('createdAt');
const sortDirection = ref('desc');
const currentPage = ref(1);
const pageSize = ref(25);
const exportFormat = ref('CSV');

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const formData = ref({});
const editingRecord = ref(null);

const modelFields = computed(() => {
  if (modelData.value.length === 0) return [];
  return Object.keys(modelData.value[0]).filter(key => key !== '__typename');
});

const editableFields = computed(() => {
  return modelFields.value.filter(field => field !== 'id' && !field.includes('_local'));
});

const requiredFields = computed(() => {
  // This would be determined by the model schema
  return ['name', 'email', 'title', 'key', 'type'].filter(field => 
    editableFields.value.includes(field)
  );
});

const filteredRecords = computed(() => {
  let filtered = modelData.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(record => 
      Object.values(record).some(value => 
        String(value).toLowerCase().includes(query)
      )
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortField.value];
    const bVal = b[sortField.value];
    
    if (sortDirection.value === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return filtered;
});

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredRecords.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredRecords.value.length / pageSize.value);
});

const allSelected = computed(() => {
  return paginatedRecords.value.length > 0 && 
         selectedRecords.value.length === paginatedRecords.value.length;
});

onMounted(() => {
  trackAction('data-management-loaded');
});

const loadModelData = async () => {
  if (!selectedModel.value) return;

  try {
    const query = gql`
      query List${selectedModel.value}s {
        list${selectedModel.value}s {
          ${getModelFields(selectedModel.value)}
        }
      }
    `;

    const result = await apolloClient.query({
      query,
      fetchPolicy: 'network-only'
    });

    modelData.value = result.data[`list${selectedModel.value}s`] || [];
    selectedRecords.value = [];
    currentPage.value = 1;
    
    trackAction('model-data-loaded', { 
      model: selectedModel.value, 
      count: modelData.value.length 
    });
  } catch (error) {
    trackError('failed-to-load-model-data', { 
      model: selectedModel.value, 
      error: error.message 
    });
  }
};

const getModelFields = (model: string) => {
  const commonFields = 'id createdAt updatedAt';
  
  switch (model) {
    case 'User':
      return `${commonFields} userId name email role bio`;
    case 'Post':
      return `${commonFields} title content userId published`;
    case 'Setting':
      return `${commonFields} type key value entityId description isActive`;
    case 'Log':
      return `${commonFields} userId action component level metadata user { id name }`;
    default:
      return commonFields;
  }
};

const refreshData = () => {
  loadModelData();
  trackAction('data-refreshed', { model: selectedModel.value });
};

const exportData = () => {
  try {
    const data = filteredRecords.value;
    
    if (exportFormat.value === 'CSV') {
      const csv = [
        modelFields.value.join(','),
        ...data.map(record => 
          modelFields.value.map(field => {
            const value = record[field];
            return typeof value === 'object' ? JSON.stringify(value) : value;
          }).map(val => `"${val}"`).join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedModel.value}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedModel.value}-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    trackAction('data-exported', { 
      model: selectedModel.value, 
      format: exportFormat.value,
      count: data.length 
    });
  } catch (error) {
    trackError('export-failed', { error: error.message });
  }
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedRecords.value = [];
  } else {
    selectedRecords.value = paginatedRecords.value.map(record => record.id);
  }
};

const sortBy = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
  trackAction('data-sorted', { field, direction: sortDirection.value });
};

const editRecord = (record: any) => {
  editingRecord.value = record;
  formData.value = { ...record };
  showEditModal.value = true;
  trackAction('edit-record-opened', { model: selectedModel.value, id: record.id });
};

const deleteRecord = async (record: any) => {
  if (!confirm(`Are you sure you want to delete this ${selectedModel.value}?`)) {
    return;
  }

  try {
    const mutation = gql`
      mutation Delete${selectedModel.value}($input: Delete${selectedModel.value}Input!) {
        delete${selectedModel.value}(input: $input) {
          id
        }
      }
    `;

    await apolloClient.mutate({
      mutation,
      variables: { input: { id: record.id } }
    });

    await loadModelData();
    trackAction('record-deleted', { model: selectedModel.value, id: record.id });
  } catch (error) {
    trackError('delete-failed', { error: error.message });
  }
};

const bulkDelete = async () => {
  if (!confirm(`Are you sure you want to delete ${selectedRecords.value.length} records?`)) {
    return;
  }

  try {
    for (const id of selectedRecords.value) {
      const mutation = gql`
        mutation Delete${selectedModel.value}($input: Delete${selectedModel.value}Input!) {
          delete${selectedModel.value}(input: $input) {
            id
          }
        }
      `;

      await apolloClient.mutate({
        mutation,
        variables: { input: { id } }
      });
    }

    await loadModelData();
    trackAction('bulk-delete-completed', { 
      model: selectedModel.value, 
      count: selectedRecords.value.length 
    });
  } catch (error) {
    trackError('bulk-delete-failed', { error: error.message });
  }
};

const impersonateUser = async (user: any) => {
  if (!confirm(`Impersonate user ${user.name}? This will log you in as this user.`)) {
    return;
  }

  try {
    // This would implement the impersonation logic
    trackAction('user-impersonation', { 
      targetUserId: user.id, 
      targetUserName: user.name 
    });
    
    // Redirect to main app as impersonated user
    window.location.href = '/';
  } catch (error) {
    trackError('impersonation-failed', { error: error.message });
  }
};

const saveRecord = async () => {
  try {
    if (showCreateModal.value) {
      const mutation = gql`
        mutation Create${selectedModel.value}($input: Create${selectedModel.value}Input!) {
          create${selectedModel.value}(input: $input) {
            id
          }
        }
      `;

      await apolloClient.mutate({
        mutation,
        variables: { input: formData.value }
      });

      trackAction('record-created', { model: selectedModel.value });
    } else {
      const mutation = gql`
        mutation Update${selectedModel.value}($input: Update${selectedModel.value}Input!) {
          update${selectedModel.value}(input: $input) {
            id
          }
        }
      `;

      await apolloClient.mutate({
        mutation,
        variables: { input: formData.value }
      });

      trackAction('record-updated', { model: selectedModel.value, id: formData.value.id });
    }

    closeModals();
    await loadModelData();
  } catch (error) {
    trackError('save-failed', { error: error.message });
  }
};

const closeModals = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  formData.value = {};
  editingRecord.value = null;
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.data-management {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.model-selector {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 250px;
}

.data-table {
  overflow-x: auto;
  margin-bottom: 1.5rem;
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
  cursor: pointer;
  user-select: none;
}

th:hover {
  background: #e9e9e9;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: white;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
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

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.timestamp {
  font-family: monospace;
  font-size: 0.875rem;
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
  max-width: 200px;
  overflow-x: auto;
}
</style>