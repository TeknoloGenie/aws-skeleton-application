import { ref, reactive } from 'vue';
import { apolloClient } from '../graphql/client';
import { gql } from '@apollo/client/core';

interface SystemSettings {
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

class SettingsService {
  private settings = reactive<SystemSettings>({
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

  private isLoaded = ref(false);
  private isLoading = ref(false);
  private subscription: any = null;

  constructor() {
    this.loadSettings();
    this.setupSubscription();
  }

  /**
   * Get current settings
   */
  getSettings(): SystemSettings {
    return this.settings;
  }

  /**
   * Get specific setting value
   */
  getSetting<K extends keyof SystemSettings>(key: K): SystemSettings[K] {
    return this.settings[key];
  }

  /**
   * Check if settings are loaded
   */
  isSettingsLoaded(): boolean {
    return this.isLoaded.value;
  }

  /**
   * Check if settings are currently loading
   */
  isSettingsLoading(): boolean {
    return this.isLoading.value;
  }

  /**
   * Load system settings from GraphQL API
   */
  async loadSettings(): Promise<void> {
    if (this.isLoading.value) return;

    this.isLoading.value = true;

    try {
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

      const result = await apolloClient.query({
        query: SYSTEM_SETTINGS_QUERY,
        fetchPolicy: 'cache-first'
      });

      const systemSettings = result.data.listSettings || [];
      
      // Update settings with values from API
      systemSettings.forEach((setting: any) => {
        if (!setting.isActive) return;
        
        this.updateSettingValue(setting.key, setting.value);
      });

      this.isLoaded.value = true;
      console.log('System settings loaded:', this.settings);

      // Store in localStorage for offline access
      localStorage.setItem('systemSettings', JSON.stringify(this.settings));
      localStorage.setItem('systemSettingsTimestamp', Date.now().toString());

    } catch (error) {
      console.error('Failed to load system settings:', error);
      
      // Try to load from localStorage as fallback
      this.loadFromLocalStorage();
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Update a specific setting value
   */
  private updateSettingValue(key: string, value: any): void {
    switch (key) {
      case 'log_retention_days':
        this.settings.log_retention_days = value.days || 90;
        break;
      case 'batch_log_interval':
        this.settings.batch_log_interval = value.seconds || 5;
        break;
      case 'batch_log_size':
        this.settings.batch_log_size = value.count || 50;
        break;
      case 'enable_error_tracking':
        this.settings.enable_error_tracking = value.enabled !== false;
        break;
      case 'session_timeout_minutes':
        this.settings.session_timeout_minutes = value.minutes || 60;
        break;
      case 'max_login_attempts':
        this.settings.max_login_attempts = value.attempts || 5;
        break;
      case 'enable_user_impersonation':
        this.settings.enable_user_impersonation = value.enabled !== false;
        break;
      case 'timezone_detection':
        this.settings.timezone_detection = value.enabled !== false;
        break;
      case 'admin_dashboard_refresh':
        this.settings.admin_dashboard_refresh = value.seconds || 30;
        break;
      case 'export_max_records':
        this.settings.export_max_records = value.count || 10000;
        break;
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('systemSettings');
      const timestamp = localStorage.getItem('systemSettingsTimestamp');
      
      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (age < maxAge) {
          Object.assign(this.settings, JSON.parse(stored));
          this.isLoaded.value = true;
          console.log('System settings loaded from localStorage');
        }
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }

  /**
   * Setup real-time subscription for settings changes
   */
  private setupSubscription(): void {
    try {
      const SETTINGS_SUBSCRIPTION = gql`
        subscription OnSettingUpdated {
          onUpdateSetting(filter: { type: { eq: "SYSTEM" } }) {
            id
            key
            value
            isActive
            updatedAt
          }
        }
      `;

      this.subscription = apolloClient.subscribe({
        query: SETTINGS_SUBSCRIPTION
      }).subscribe({
        next: ({ data }) => {
          const setting = data.onUpdateSetting;
          if (setting && setting.isActive) {
            this.updateSettingValue(setting.key, setting.value);
            console.log(`Setting updated: ${setting.key}`, setting.value);
            
            // Update localStorage
            localStorage.setItem('systemSettings', JSON.stringify(this.settings));
            localStorage.setItem('systemSettingsTimestamp', Date.now().toString());
          }
        },
        error: (error) => {
          console.error('Settings subscription error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to setup settings subscription:', error);
    }
  }

  /**
   * Refresh settings from server
   */
  async refresh(): Promise<void> {
    this.isLoaded.value = false;
    await this.loadSettings();
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

// Global settings service instance
export const settingsService = new SettingsService();

/**
 * Vue composable for system settings
 */
export function useSystemSettings() {
  return {
    settings: settingsService.getSettings(),
    isLoaded: settingsService.isSettingsLoaded(),
    isLoading: settingsService.isSettingsLoading(),
    getSetting: settingsService.getSetting.bind(settingsService),
    refresh: settingsService.refresh.bind(settingsService)
  };
}