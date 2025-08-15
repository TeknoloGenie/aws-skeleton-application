import React, { useState, useEffect, useMemo } from 'react';
import { useAnalytics } from '../../services/analytics';
import { apolloClient } from '../../graphql/client';
import { gql } from '@apollo/client';

const DataManagement: React.FC = () => {
  const { trackAction, trackError } = useAnalytics('data-management');
  
  const availableModels = ['User', 'Post', 'Setting', 'Log'];
  const [selectedModel, setSelectedModel] = useState('');
  const [modelData, setModelData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON'>('CSV');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const modelFields = useMemo(() => {
    if (modelData.length === 0) return [];
    return Object.keys(modelData[0]).filter(key => key !== '__typename');
  }, [modelData]);

  const editableFields = useMemo(() => {
    return modelFields.filter(field => field !== 'id' && !field.includes('_local'));
  }, [modelFields]);

  const requiredFields = useMemo(() => {
    return ['name', 'email', 'title', 'key', 'type'].filter(field => 
      editableFields.includes(field)
    );
  }, [editableFields]);

  const filteredRecords = useMemo(() => {
    let filtered = modelData;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        Object.values(record).some(value => 
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [modelData, searchQuery, sortField, sortDirection]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredRecords.length / pageSize);
  }, [filteredRecords.length, pageSize]);

  const allSelected = useMemo(() => {
    return paginatedRecords.length > 0 && 
           selectedRecords.length === paginatedRecords.length;
  }, [paginatedRecords.length, selectedRecords.length]);

  useEffect(() => {
    trackAction('data-management-loaded');
  }, []);

  const getModelFields = (model: string): string => {
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

  const loadModelData = async () => {
    if (!selectedModel) return;

    try {
      const query = gql`
        query List${selectedModel}s {
          list${selectedModel}s {
            ${getModelFields(selectedModel)}
          }
        }
      `;

      const result = await apolloClient.query({
        query,
        fetchPolicy: 'network-only'
      });

      setModelData(result.data[`list${selectedModel}s`] || []);
      setSelectedRecords([]);
      setCurrentPage(1);
      
      trackAction('model-data-loaded', { 
        model: selectedModel, 
        count: result.data[`list${selectedModel}s`]?.length || 0
      });
    } catch (error) {
      trackError('failed-to-load-model-data', { 
        model: selectedModel, 
        error: error.message 
      });
    }
  };

  const refreshData = () => {
    loadModelData();
    trackAction('data-refreshed', { model: selectedModel });
  };

  const exportData = () => {
    try {
      const data = filteredRecords;
      
      if (exportFormat === 'CSV') {
        const csv = [
          modelFields.join(','),
          ...data.map(record => 
            modelFields.map(field => {
              const value = record[field];
              return typeof value === 'object' ? JSON.stringify(value) : value;
            }).map(val => `"${val}"`).join(',')
          )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedModel}-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedModel}-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      trackAction('data-exported', { 
        model: selectedModel, 
        format: exportFormat,
        count: data.length 
      });
    } catch (error) {
      trackError('export-failed', { error: error.message });
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(paginatedRecords.map(record => record.id));
    }
  };

  const sortBy = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    trackAction('data-sorted', { field, direction: sortDirection });
  };

  const editRecord = (record: any) => {
    setEditingRecord(record);
    setFormData({ ...record });
    setShowEditModal(true);
    trackAction('edit-record-opened', { model: selectedModel, id: record.id });
  };

  const deleteRecord = async (record: any) => {
    if (!window.confirm(`Are you sure you want to delete this ${selectedModel}?`)) {
      return;
    }

    try {
      const mutation = gql`
        mutation Delete${selectedModel}($input: Delete${selectedModel}Input!) {
          delete${selectedModel}(input: $input) {
            id
          }
        }
      `;

      await apolloClient.mutate({
        mutation,
        variables: { input: { id: record.id } }
      });

      await loadModelData();
      trackAction('record-deleted', { model: selectedModel, id: record.id });
    } catch (error) {
      trackError('delete-failed', { error: error.message });
    }
  };

  const impersonateUser = async (user: any) => {
    if (!window.confirm(`Impersonate user ${user.name}? This will log you in as this user.`)) {
      return;
    }

    try {
      trackAction('user-impersonation', { 
        targetUserId: user.id, 
        targetUserName: user.name 
      });
      
      window.location.href = '/';
    } catch (error) {
      trackError('impersonation-failed', { error: error.message });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="data-management">
      <div className="management-header">
        <h2>Data Management</h2>
        <div className="model-selector">
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="">Select Model</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <button onClick={refreshData} className="btn-secondary">Refresh</button>
          <button 
            onClick={exportData} 
            className="btn-primary" 
            disabled={!selectedModel}
          >
            Export {exportFormat}
          </button>
          <select 
            value={exportFormat} 
            onChange={(e) => setExportFormat(e.target.value as 'CSV' | 'JSON')}
          >
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </div>
      </div>

      {selectedModel && (
        <div className="model-management">
          <div className="actions-bar">
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="btn-primary"
            >
              Create New {selectedModel}
            </button>
            <div className="search-bar">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..." 
                className="search-input"
              />
            </div>
          </div>

          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={allSelected}
                    />
                  </th>
                  {modelFields.map(field => (
                    <th key={field} onClick={() => sortBy(field)}>
                      {field}
                      {sortField === field && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        value={record.id}
                        checked={selectedRecords.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords([...selectedRecords, record.id]);
                          } else {
                            setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                          }
                        }}
                      />
                    </td>
                    {modelFields.map(field => (
                      <td key={field}>
                        {field.includes('At') ? (
                          <div className="timestamp">
                            {formatTimestamp(record[field])}
                          </div>
                        ) : typeof record[field] === 'object' ? (
                          <details>
                            <summary>Object</summary>
                            <pre>{JSON.stringify(record[field], null, 2)}</pre>
                          </details>
                        ) : (
                          record[field]
                        )}
                      </td>
                    ))}
                    <td className="actions">
                      <button 
                        onClick={() => editRecord(record)} 
                        className="btn-sm btn-secondary"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => deleteRecord(record)} 
                        className="btn-sm btn-danger"
                      >
                        Delete
                      </button>
                      {selectedModel === 'User' && (
                        <button 
                          onClick={() => impersonateUser(record)}
                          className="btn-sm btn-warning"
                        >
                          Impersonate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(currentPage - 1)} 
              disabled={currentPage <= 1}
              className="btn-secondary"
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(currentPage + 1)} 
              disabled={currentPage >= totalPages}
              className="btn-secondary"
            >
              Next
            </button>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;