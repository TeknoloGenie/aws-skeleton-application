import React, { useState, useEffect, useMemo } from 'react';
import { useAnalytics } from '../../services/analytics';
import { apolloClient } from '../../graphql/client';
import { gql } from '@apollo/client';

interface LogEntry {
  id: string;
  userId: string;
  action: string;
  component: string;
  level: string;
  metadata?: any;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const { trackAction, trackError } = useAnalytics('analytics-dashboard');
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    component: '',
    action: '',
    level: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

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

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.component.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.user?.name?.toLowerCase().includes(search)
      );
    }

    if (filters.component) {
      filtered = filtered.filter(log => log.component === filters.component);
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(log => new Date(log.createdAt) <= toDate);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [logs, filters]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / pageSize);
  }, [filteredLogs.length]);

  const uniqueComponents = useMemo(() => {
    return [...new Set(logs.map(log => log.component))].sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    return [...new Set(logs.map(log => log.action))].sort();
  }, [logs]);

  useEffect(() => {
    loadLogs();
    setupSubscription();
  }, []);

  const loadLogs = async () => {
    try {
      const result = await apolloClient.query({
        query: LOGS_QUERY,
        variables: { limit: 1000 },
        fetchPolicy: 'network-only'
      });
      
      setLogs(result.data.listLogs.items);
      trackAction('logs-loaded', { count: result.data.listLogs.items.length });
    } catch (error) {
      trackError('failed-to-load-logs', { error: error.message });
    }
  };

  const setupSubscription = () => {
    try {
      const subscription = apolloClient.subscribe({
        query: LOGS_SUBSCRIPTION
      }).subscribe({
        next: ({ data }) => {
          setLogs(prevLogs => [data.onCreateLog, ...prevLogs]);
          trackAction('real-time-log-received');
        },
        error: (error) => {
          trackError('subscription-error', { error: error.message });
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      trackError('failed-to-setup-subscription', { error: error.message });
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      component: '',
      action: '',
      level: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
    trackAction('filters-cleared');
  };

  const exportLogs = () => {
    try {
      const csvData = filteredLogs.map(log => ({
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-controls">
        <div className="filters">
          <input 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            placeholder="Search logs..." 
            className="search-input"
          />
          
          <select 
            value={filters.component} 
            onChange={(e) => setFilters({...filters, component: e.target.value})}
          >
            <option value="">All Components</option>
            {uniqueComponents.map(component => (
              <option key={component} value={component}>{component}</option>
            ))}
          </select>

          <select 
            value={filters.action} 
            onChange={(e) => setFilters({...filters, action: e.target.value})}
          >
            <option value="">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <select 
            value={filters.level} 
            onChange={(e) => setFilters({...filters, level: e.target.value})}
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>

          <input 
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            type="datetime-local" 
            className="date-input"
          />
          
          <input 
            value={filters.dateTo}
            onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            type="datetime-local" 
            className="date-input"
          />

          <button onClick={clearFilters} className="btn-secondary">Clear Filters</button>
          <button onClick={exportLogs} className="btn-primary">Export CSV</button>
        </div>
      </div>

      <div className="analytics-content">
        <div className="charts-section">
          <div className="chart-container">
            <h3>Activity Timeline</h3>
            <div className="chart-placeholder">Chart would be rendered here</div>
          </div>
          
          <div className="chart-container">
            <h3>Action Distribution</h3>
            <div className="chart-placeholder">Chart would be rendered here</div>
          </div>
          
          <div className="chart-container">
            <h3>Component Usage</h3>
            <div className="chart-placeholder">Chart would be rendered here</div>
          </div>
          
          <div className="chart-container">
            <h3>Error Rates</h3>
            <div className="chart-placeholder">Chart would be rendered here</div>
          </div>
        </div>

        <div className="logs-section">
          <div className="logs-header">
            <h3>Raw Logs ({filteredLogs.length})</h3>
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
            </div>
          </div>

          <div className="logs-table">
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
                {paginatedLogs.map(log => (
                  <tr key={log.id} className={`log-row ${log.level}`}>
                    <td>{formatTimestamp(log.createdAt)}</td>
                    <td>{log.user?.name || log.userId}</td>
                    <td>{log.component}</td>
                    <td>{log.action}</td>
                    <td>
                      <span className={`level-badge ${log.level}`}>{log.level}</span>
                    </td>
                    <td>
                      {log.metadata && (
                        <details>
                          <summary>View</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;