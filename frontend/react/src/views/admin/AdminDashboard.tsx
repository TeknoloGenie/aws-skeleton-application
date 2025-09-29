import React, { useState, useEffect, useCallback } from 'react';
import { useAnalytics } from '../../services/analytics';
import AnalyticsDashboard from './AnalyticsDashboard';
import DataManagement from './DataManagement';
import AppConfiguration from './AppConfiguration';
import './AdminDashboard.css';

interface Tab {
  id: string;
  label: string;
}

const AdminDashboard: React.FC = () => {
  const { trackAction, trackError } = useAnalytics('admin-dashboard');
  const [activeTab, setActiveTab] = useState('analytics');
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);

  const tabs: Tab[] = [
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'data', label: '🗃️ Data Management' },
    { id: 'config', label: '⚙️ Configuration' }
  ];

  const loadCurrentUser = useCallback(async () => {
    try {
      // This would get current user from auth service
      setCurrentUser({ id: 'admin', name: 'Admin User' });
      trackAction('dashboard-loaded');
    } catch (error) {
      trackError('failed-to-load-user', { error: (error as Error).message });
    }
  }, [trackAction, trackError]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleSignOut = async () => {
    try {
      trackAction('admin-signout');
      // Implement sign out logic
      window.location.href = '/login';
    } catch (error) {
      trackError('signout-failed', { error: (error as Error).message });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'data':
        return <DataManagement />;
      case 'config':
        return <AppConfiguration />;
      default:
        return <AnalyticsDashboard />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>{currentUser?.name}</span>
          <button onClick={handleSignOut} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;