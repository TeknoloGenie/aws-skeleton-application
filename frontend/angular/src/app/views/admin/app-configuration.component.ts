import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    enable_user_impersonation: false,
    timezone_detection: true,
    admin_dashboard_refresh: 30,
    export_max_records: 10000
  };

  originalSettings: Settings = { ...this.settings };
  hasChanges = false;
  lastUpdated: string | null = null;
  isLoading = false;
  isSaving = false;

  constructor(
    private analyticsService: AnalyticsService,
    private graphqlClient: GraphQLClientService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.analyticsService.trackView('app-configuration');
  }

  async loadSettings(): Promise<void> {
    try {
      this.isLoading = true;
      
      const query = `
        query ListSettings {
          listSettings {
            id
            key
            value
            category
            updatedAt
          }
        }
      `;

      const result = await this.graphqlClient.query(query);
      
      if (result.data?.listSettings) {
        const settings = result.data.listSettings;
        
        // Map settings to our interface
        settings.forEach((setting: any) => {
          if (setting.category === 'app_config') {
            const key = setting.key as keyof Settings;
            if (key in this.settings) {
              // Parse the value based on the setting type
              let value = setting.value;
              if (typeof this.settings[key] === 'number') {
                value = parseInt(value, 10);
              } else if (typeof this.settings[key] === 'boolean') {
                value = value === 'true';
              }
              (this.settings as any)[key] = value;
            }
          }
        });
        
        this.originalSettings = { ...this.settings };
        this.lastUpdated = settings[0]?.updatedAt || null;
      }
    } catch (error: any) {
      this.analyticsService.trackError('failed-to-load-settings', 'app-configuration', { error: error?.message || 'Unknown error' });
    } finally {
      this.isLoading = false;
    }
  }

  onSettingChange(): void {
    this.hasChanges = JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
    
    if (this.hasChanges) {
      this.analyticsService.trackAction('settings-modified', 'app-configuration');
    }
  }

  async saveSettings(): Promise<void> {
    try {
      this.isSaving = true;
      
      this.analyticsService.trackAction('save-settings', 'app-configuration', {
        changedSettings: this.getChangedSettings()
      });

      // Save each changed setting
      const changedSettings = this.getChangedSettings();
      
      for (const [key, value] of Object.entries(changedSettings)) {
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
            key,
            value: String(value),
            category: 'app_config'
          }
        });
      }
      
      this.originalSettings = { ...this.settings };
      this.hasChanges = false;
      this.lastUpdated = new Date().toISOString();
      
      this.analyticsService.trackAction('settings-saved', 'app-configuration');
      
    } catch (error: any) {
      this.analyticsService.trackError('failed-to-save-settings', 'app-configuration', { error: error?.message || 'Unknown error' });
    } finally {
      this.isSaving = false;
    }
  }

  private getChangedSettings(): Record<string, any> {
    const changed: Record<string, any> = {};
    
    for (const key in this.settings) {
      if (this.settings[key as keyof Settings] !== this.originalSettings[key as keyof Settings]) {
        changed[key] = this.settings[key as keyof Settings];
      }
    }
    
    return changed;
  }

  get changedSettings(): {key: string, value: any}[] {
    const changed = this.getChangedSettings();
    return Object.entries(changed).map(([key, value]) => ({ key, value }));
  }

  resetSettings(): void {
    this.settings = { ...this.originalSettings };
    this.hasChanges = false;
    this.analyticsService.trackAction('settings-reset', 'app-configuration');
  }

  resetChanges(): void {
    this.resetSettings();
  }

  formatTimestamp(timestamp: string | null): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }

  exportSettings(): void {
    const settingsJson = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `app-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
    
    this.analyticsService.trackAction('settings-exported', 'app-configuration');
  }

  async importSettings(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate the imported settings
      for (const key in importedSettings) {
        if (key in this.settings) {
          (this.settings as any)[key] = importedSettings[key];
        }
      }
      
      this.onSettingChange();
      this.analyticsService.trackAction('settings-imported', 'app-configuration');
      
    } catch (error: any) {
      this.analyticsService.trackError('settings-import-failed', 'app-configuration', { error: error?.message || 'Unknown error' });
    }
  }
}
