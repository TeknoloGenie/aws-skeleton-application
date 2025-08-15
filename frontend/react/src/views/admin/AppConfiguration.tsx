import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../services/analytics';
import { apolloClient } from '../../graphql/client';
import { gql } from '@apollo/client';

interface Settings {
  log_retention_days: number;
  batch_log_interval: number;
  batch_log_size: number;
  enable_error_tracking: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  enable_user_impersonation: boolean;
  timezone_detection: boolean;
  admin_dashboard_refresh: number;
  export_max_records: number;
}

const AppConfiguration: React.FC = () => {
  const { trackAction, trackError } = useAnalytics('app-configuration');
  
  const [settings, setSettings] = useState<Settings>({
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

  const [originalSettings, setOriginalSettings] = useState<Settings>({} as Settings);
  const [changedSettings, setChangedSettings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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

  const hasChanges = changedSettings.length > 0;

  useEffect(() => {
    loadSettings();
    trackAction('configuration-loaded');
  }, []);

  const loadSettings = async () => {
    try {
      const result = await apolloClient.query({
        query: SYSTEM_SETTINGS_QUERY,
        fetchPolicy: 'network-only'
      });

      const systemSettings = result.data.listSettings || [];
      const newSettings = { ...settings };
      
      systemSettings.forEach((setting: any) => {
        if (!setting.isActive) return;
        
        const key = setting.key;
        const value = setting.value;
        
        switch (key) {
          case 'log_retention_days':
            newSettings.log_retention_days = value.days || 90;
            break;
          case 'batch_log_interval':
            newSettings.batch_log_interval = value.seconds || 5;
            break;
          case 'batch_log_size':
            newSettings.batch_log_size = value.count || 50;
            break;
          case 'enable_error_tracking':
            newSettings.enable_error_tracking = value.enabled !== false;
            break;
          case 'session_timeout_minutes':
            newSettings.session_timeout_minutes = value.minutes || 60;
            break;
          case 'max_login_attempts':
            newSettings.max_login_attempts = value.attempts || 5;
            break;
          case 'enable_user_impersonation':
            newSettings.enable_user_impersonation = value.enabled !== false;
            break;
          case 'timezone_detection':
            newSettings.timezone_detection = value.enabled !== false;
            break;
          case 'admin_dashboard_refresh':
            newSettings.admin_dashboard_refresh = value.seconds || 30;
            break;
          case 'export_max_records':
            newSettings.export_max_records = value.count || 10000;
            break;
        }
        
        if (setting.updatedAt && (!lastUpdated || setting.updatedAt > lastUpdated)) {
          setLastUpdated(setting.updatedAt);
        }
      });

      setSettings(newSettings);
      setOriginalSettings({ ...newSettings });
      setChangedSettings([]);

      trackAction('settings-loaded', { count: systemSettings.length });
    } catch (error) {
      trackError('failed-to-load-settings', { error: error.message });
    }
  };

  const markChanged = (key: string) => {
    if (!changedSettings.includes(key)) {
      setChangedSettings([...changedSettings, key]);
    }
    trackAction('setting-changed', { key });
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setSettings({ ...settings, [key]: value });
    markChanged(key);
  };

  const saveAllSettings = async () => {
    try {
      const updates = [];
      
      for (const key of changedSettings) {
        const value = settings[key as keyof Settings];
        let settingValue;
        
        switch (key) {
          case 'log_retention_days':
            settingValue = { days: value };
            break;
          case 'batch_log_interval':
            settingValue = { seconds: value };
            break;
          case 'batch_log_size':
            settingValue = { count: value };
            break;
          case 'enable_error_tracking':
            settingValue = { enabled: value };
            break;
          case 'session_timeout_minutes':
            settingValue = { minutes: value };
            break;
          case 'max_login_attempts':
            settingValue = { attempts: value };
            break;
          case 'enable_user_impersonation':
            settingValue = { enabled: value };
            break;
          case 'timezone_detection':
            settingValue = { enabled: value };
            break;
          case 'admin_dashboard_refresh':
            settingValue = { seconds: value };
            break;
          case 'export_max_records':
            settingValue = { count: value };
            break;
        }

        updates.push({
          key,
          value: settingValue,
          oldValue: originalSettings[key as keyof Settings]
        });
      }

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

      setOriginalSettings({ ...settings });
      setChangedSettings([]);
      setLastUpdated(new Date().toISOString());

      trackAction('settings-saved', { 
        count: updates.length,
        keys: updates.map(u => u.key)
      });

      alert('Settings saved successfully!');
    } catch (error) {
      trackError('failed-to-save-settings', { error: error.message });
      alert('Failed to save settings. Please try again.');
    }
  };

  const resetChanges = () => {
    setSettings({ ...originalSettings });
    setChangedSettings([]);
    trackAction('settings-reset');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="app-configuration">
      <div className="config-header">
        <h2>Application Configuration</h2>
        <div className="config-actions">
          <button onClick={loadSettings} className="btn-secondary">Refresh</button>
          <button 
            onClick={saveAllSettings} 
            className="btn-primary" 
            disabled={!hasChanges}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="config-sections">
        <div className="config-section">
          <h3>📊 Analytics & Logging</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Log Retention (Days)</label>
              <input 
                type="number" 
                value={settings.log_retention_days}
                onChange={(e) => handleSettingChange('log_retention_days', Number(e.target.value))}
                min="1" 
                max="365"
                className="form-input"
              />
              <small>How long to keep analytics logs (1-365 days)</small>
            </div>

            <div className="setting-item">
              <label>Batch Log Interval (Seconds)</label>
              <input 
                type="number" 
                value={settings.batch_log_interval}
                onChange={(e) => handleSettingChange('batch_log_interval', Number(e.target.value))}
                min="1" 
                max="60"
                className="form-input"
              />
              <small>How often to process log batches (1-60 seconds)</small>
            </div>

            <div className="setting-item">
              <label>Batch Log Size</label>
              <input 
                type="number" 
                value={settings.batch_log_size}
                onChange={(e) => handleSettingChange('batch_log_size', Number(e.target.value))}
                min="10" 
                max="100"
                className="form-input"
              />
              <small>Maximum events per batch (10-100)</small>
            </div>

            <div className="setting-item">
              <label>Enable Error Tracking</label>
              <input 
                type="checkbox" 
                checked={settings.enable_error_tracking}
                onChange={(e) => handleSettingChange('enable_error_tracking', e.target.checked)}
                className="form-checkbox"
              />
              <small>Automatically track and log errors</small>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>🔐 Security & Sessions</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Session Timeout (Minutes)</label>
              <input 
                type="number" 
                value={settings.session_timeout_minutes}
                onChange={(e) => handleSettingChange('session_timeout_minutes', Number(e.target.value))}
                min="5" 
                max="480"
                className="form-input"
              />
              <small>User session timeout (5-480 minutes)</small>
            </div>

            <div className="setting-item">
              <label>Max Login Attempts</label>
              <input 
                type="number" 
                value={settings.max_login_attempts}
                onChange={(e) => handleSettingChange('max_login_attempts', Number(e.target.value))}
                min="3" 
                max="10"
                className="form-input"
              />
              <small>Failed login attempts before lockout (3-10)</small>
            </div>

            <div className="setting-item">
              <label>Enable User Impersonation</label>
              <input 
                type="checkbox" 
                checked={settings.enable_user_impersonation}
                onChange={(e) => handleSettingChange('enable_user_impersonation', e.target.checked)}
                className="form-checkbox"
              />
              <small>Allow admin user impersonation</small>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>🎨 User Interface</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Enable Timezone Detection</label>
              <input 
                type="checkbox" 
                checked={settings.timezone_detection}
                onChange={(e) => handleSettingChange('timezone_detection', e.target.checked)}
                className="form-checkbox"
              />
              <small>Auto-detect user timezone for datetime display</small>
            </div>

            <div className="setting-item">
              <label>Admin Dashboard Refresh (Seconds)</label>
              <input 
                type="number" 
                value={settings.admin_dashboard_refresh}
                onChange={(e) => handleSettingChange('admin_dashboard_refresh', Number(e.target.value))}
                min="10" 
                max="300"
                className="form-input"
              />
              <small>Dashboard refresh interval (10-300 seconds)</small>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>📤 Data Export</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Export Max Records</label>
              <input 
                type="number" 
                value={settings.export_max_records}
                onChange={(e) => handleSettingChange('export_max_records', Number(e.target.value))}
                min="1000" 
                max="100000"
                step="1000"
                className="form-input"
              />
              <small>Maximum records for CSV/JSON export (1K-100K)</small>
            </div>
          </div>
        </div>
      </div>

      <div className="config-footer">
        {hasChanges && (
          <div className="changes-indicator">
            <span className="changes-badge">{changedSettings.length} unsaved changes</span>
            <button onClick={resetChanges} className="btn-link">Reset</button>
          </div>
        )}
        
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {formatTimestamp(lastUpdated)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppConfiguration;