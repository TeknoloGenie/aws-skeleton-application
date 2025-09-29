import { useMutation, useQuery } from '@apollo/client';
import { getCurrentUser } from 'aws-amplify/auth';
import React, { useEffect, useState } from 'react';
import { CREATE_SETTING, GET_USER_SETTINGS, UPDATE_SETTING } from '../graphql/settings';

interface ThemeSettings {
  theme: string;
  primaryColor: string;
  fontSize: string;
  compactMode: boolean;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: string;
}

interface PrivacySettings {
  profileVisibility: string;
  showEmail: boolean;
  allowMessages: boolean;
}

interface SaveStatus {
  type: 'success' | 'error';
  message: string;
}

const UserSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; userId?: string; email?: string; name?: string } | null>(null);

  // Settings state
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    theme: 'light',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    compactMode: false
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: false,
    sms: false,
    frequency: 'daily'
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: false,
    allowMessages: true
  });

  // Setting IDs for updates
  const [settingIds, setSettingIds] = useState<{[key: string]: string | null}>({
    theme: null,
    notifications: null,
    privacy: null
  });

  // GraphQL mutations
  const [createSetting] = useMutation(CREATE_SETTING);
  const [updateSetting] = useMutation(UPDATE_SETTING);

  // Load user settings
  useQuery(GET_USER_SETTINGS, {
    variables: { entityId: currentUser?.userId, type: 'user' },
    skip: !currentUser?.userId,
    onCompleted: (data) => {
      if (data?.listSettings?.items) {
        const settings = data.listSettings.items;
        
        settings.forEach((setting: { id: string; key: string; value: Record<string, unknown> }) => {
          if (setting.key === 'theme') {
            setThemeSettings({ ...themeSettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, theme: setting.id }));
          } else if (setting.key === 'notifications') {
            setNotificationSettings({ ...notificationSettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, notifications: setting.id }));
          } else if (setting.key === 'privacy') {
            setPrivacySettings({ ...privacySettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, privacy: setting.id }));
          }
        });
      }
      setLoading(false);
    },
    onError: (err) => {
      setError(err);
      setLoading(false);
    }
  });

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user as unknown as { id: string; userId?: string; email?: string; name?: string });
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Generic save setting function
  const saveSetting = async (key: string, value: Record<string, unknown>, successMessage: string) => {
    try {
      setSaveStatus(null);

      const settingInput = {
        type: 'user',
        key,
        value,
        entityId: currentUser?.userId || currentUser?.id,
        description: `User ${key} preferences`,
        isActive: true
      };

      if (settingIds[key]) {
        // Update existing setting
        await updateSetting({
          variables: {
            input: {
              id: settingIds[key],
              value
            }
          }
        });
      } else {
        // Create new setting
        const result = await createSetting({
          variables: { input: settingInput }
        });
        setSettingIds(prev => ({ ...prev, [key]: result.data.createSetting.id }));
      }

      setSaveStatus({
        type: 'success',
        message: successMessage
      });

      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);

    } catch (err) {
      console.error(`Error saving ${key} setting:`, err);
      setSaveStatus({
        type: 'error',
        message: `Failed to save ${key} settings`
      });
    }
  };

  // Update handlers
  const updateThemeSetting = () => {
    saveSetting('theme', themeSettings as unknown as Record<string, unknown>, 'Theme preferences updated');
  };

  const updateNotificationSetting = () => {
    saveSetting('notifications', notificationSettings as unknown as Record<string, unknown>, 'Notification preferences updated');
  };

  const updatePrivacySetting = () => {
    saveSetting('privacy', privacySettings as unknown as Record<string, unknown>, 'Privacy settings updated');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
            <div className="mt-2 text-sm text-red-700">{error.message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-settings max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">User Settings</h2>
        
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Theme Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <select 
                  value={themeSettings.theme}
                  onChange={(e) => {
                    setThemeSettings({ ...themeSettings, theme: e.target.value });
                    setTimeout(updateThemeSetting, 100);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <input 
                  type="color" 
                  value={themeSettings.primaryColor}
                  onChange={(e) => {
                    setThemeSettings({ ...themeSettings, primaryColor: e.target.value });
                    setTimeout(updateThemeSetting, 100);
                  }}
                  aria-label="Primary color"
                  className="block w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <select 
                  value={themeSettings.fontSize}
                  onChange={(e) => {
                    setThemeSettings({ ...themeSettings, fontSize: e.target.value });
                    setTimeout(updateThemeSetting, 100);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="compactMode" 
                  checked={themeSettings.compactMode}
                  onChange={(e) => {
                    setThemeSettings({ ...themeSettings, compactMode: e.target.checked });
                    setTimeout(updateThemeSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="compactMode" className="ml-2 block text-sm text-gray-900">Compact Mode</label>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationSettings.email}
                  onChange={(e) => {
                    setNotificationSettings({ ...notificationSettings, email: e.target.checked });
                    setTimeout(updateNotificationSetting, 100);
                  }}
                  aria-label="Email notifications"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Push Notifications</label>
                  <p className="text-sm text-gray-500">Receive push notifications in browser</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationSettings.push}
                  onChange={(e) => {
                    setNotificationSettings({ ...notificationSettings, push: e.target.checked });
                    setTimeout(updateNotificationSetting, 100);
                  }}
                  aria-label="Push notifications"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                  <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={notificationSettings.sms}
                  onChange={(e) => {
                    setNotificationSettings({ ...notificationSettings, sms: e.target.checked });
                    setTimeout(updateNotificationSetting, 100);
                  }}
                  aria-label="SMS notifications"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
                <select 
                  value={notificationSettings.frequency}
                  onChange={(e) => {
                    setNotificationSettings({ ...notificationSettings, frequency: e.target.value });
                    setTimeout(updateNotificationSetting, 100);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                <select 
                  value={privacySettings.profileVisibility}
                  onChange={(e) => {
                    setPrivacySettings({ ...privacySettings, profileVisibility: e.target.value });
                    setTimeout(updatePrivacySetting, 100);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Show Email</label>
                  <p className="text-sm text-gray-500">Display email address on profile</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={privacySettings.showEmail}
                  onChange={(e) => {
                    setPrivacySettings({ ...privacySettings, showEmail: e.target.checked });
                    setTimeout(updatePrivacySetting, 100);
                  }}
                  aria-label="Show email"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Allow Messages</label>
                  <p className="text-sm text-gray-500">Allow other users to send you messages</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={privacySettings.allowMessages}
                  onChange={(e) => {
                    setPrivacySettings({ ...privacySettings, allowMessages: e.target.checked });
                    setTimeout(updatePrivacySetting, 100);
                  }}
                  aria-label="Allow messages"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`mt-6 p-4 rounded-md ${saveStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {saveStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettings;
