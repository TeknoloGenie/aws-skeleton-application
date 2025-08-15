import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { GraphQLClientService } from '../../graphql/client';

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

@Component({
  selector: 'app-app-configuration',
  templateUrl: './app-configuration.component.html',
  styleUrls: ['./app-configuration.component.css']
})
export class AppConfigurationComponent implements OnInit {
  settings: Settings = {
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
  };

  originalSettings: Settings = {} as Settings;
  changedSettings: string[] = [];
  lastUpdated: string | null = null;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.analyticsService.trackView('app-configuration');
  }

  get hasChanges(): boolean {
    return this.changedSettings.length > 0;
  }

  async loadSettings(): Promise<void> {
    try {
      const query = `
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

      const result = await this.graphqlClient.query(query);
      const systemSettings = result.data.listSettings || [];
      
      systemSettings.forEach((setting: any) => {
        if (!setting.isActive) return;
        
        const key = setting.key;
        const value = setting.value;
        
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
        
        if (setting.updatedAt && (!this.lastUpdated || setting.updatedAt > this.lastUpdated)) {
          this.lastUpdated = setting.updatedAt;
        }
      });

      this.originalSettings = { ...this.settings };
      this.changedSettings = [];

      this.analyticsService.trackAction('settings-loaded', 'app-configuration', { count: systemSettings.length });
    } catch (error) {
      this.analyticsService.trackError('failed-to-load-settings', 'app-configuration', { error: error.message });
    }
  }

  markChanged(key: string): void {
    if (!this.changedSettings.includes(key)) {
      this.changedSettings.push(key);
    }
    this.analyticsService.trackAction('setting-changed', 'app-configuration', { key });
  }

  async saveAllSettings(): Promise<void> {
    try {
      const updates = [];
      
      for (const key of this.changedSettings) {
        const value = this.settings[key as keyof Settings];
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
          oldValue: this.originalSettings[key as keyof Settings]
        });
      }

      for (const update of updates) {
        const mutation = `
          mutation UpdateSetting($input: UpdateSettingInput!) {
            updateSetting(input: $input) {
              id
              key
              value
              updatedAt
            }
          }
        `;

        await this.graphqlClient.query(mutation, {
          input: {
            id: `system-${update.key.replace(/_/g, '-')}`,
            type: 'SYSTEM',
            key: update.key,
            value: update.value,
            entityId: 'GLOBAL',
            isActive: true
          }
        });
      }

      this.originalSettings = { ...this.settings };
      this.changedSettings = [];
      this.lastUpdated = new Date().toISOString();

      this.analyticsService.trackAction('settings-saved', 'app-configuration', { 
        count: updates.length,
        keys: updates.map(u => u.key)
      });

      alert('Settings saved successfully!');
    } catch (error) {
      this.analyticsService.trackError('failed-to-save-settings', 'app-configuration', { error: error.message });
      alert('Failed to save settings. Please try again.');
    }
  }

  resetChanges(): void {
    this.settings = { ...this.originalSettings };
    this.changedSettings = [];
    this.analyticsService.trackAction('settings-reset', 'app-configuration');
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
}