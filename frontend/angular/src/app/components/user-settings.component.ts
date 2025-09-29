import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import { getCurrentUser } from 'aws-amplify/auth';
import { GET_USER_SETTINGS, CREATE_SETTING, UPDATE_SETTING } from '../graphql/settings';

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

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-settings max-w-4xl mx-auto">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">User Settings</h2>
        
        <!-- Loading State -->
        <div *ngIf="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error loading settings</h3>
              <div class="mt-2 text-sm text-red-700">{{ error }}</div>
            </div>
          </div>
        </div>

        <!-- Settings Form -->
        <div *ngIf="!loading" class="space-y-6">
          <!-- Theme Settings -->
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Theme Preferences</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <select 
                  [(ngModel)]="themeSettings.theme" 
                  (change)="updateThemeSetting()"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <input 
                  type="color" 
                  [(ngModel)]="themeSettings.primaryColor" 
                  (change)="updateThemeSetting()"
                  class="block w-full h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <select 
                  [(ngModel)]="themeSettings.fontSize" 
                  (change)="updateThemeSetting()"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="compactMode" 
                  [(ngModel)]="themeSettings.compactMode" 
                  (change)="updateThemeSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="compactMode" class="ml-2 block text-sm text-gray-900">Compact Mode</label>
              </div>
            </div>
          </div>

          <!-- Notification Settings -->
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Email Notifications</label>
                  <p class="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="notificationSettings.email" 
                  (change)="updateNotificationSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Push Notifications</label>
                  <p class="text-sm text-gray-500">Receive push notifications in browser</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="notificationSettings.push" 
                  (change)="updateNotificationSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">SMS Notifications</label>
                  <p class="text-sm text-gray-500">Receive notifications via SMS</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="notificationSettings.sms" 
                  (change)="updateNotificationSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
                <select 
                  [(ngModel)]="notificationSettings.frequency" 
                  (change)="updateNotificationSetting()"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Privacy Settings -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                <select 
                  [(ngModel)]="privacySettings.profileVisibility" 
                  (change)="updatePrivacySetting()"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Show Email</label>
                  <p class="text-sm text-gray-500">Display email address on profile</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="privacySettings.showEmail" 
                  (change)="updatePrivacySetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Allow Messages</label>
                  <p class="text-sm text-gray-500">Allow other users to send you messages</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="privacySettings.allowMessages" 
                  (change)="updatePrivacySetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Save Status -->
        <div *ngIf="saveStatus" 
             class="mt-6 p-4 rounded-md"
             [ngClass]="saveStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
          {{ saveStatus.message }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-settings {
      max-width: 800px;
      margin: 0 auto;
    }
  `]
})
export class UserSettingsComponent implements OnInit {
  loading = true;
  error: string | null = null;
  saveStatus: SaveStatus | null = null;
  currentUser: any = null;

  // Settings data
  themeSettings: ThemeSettings = {
    theme: 'light',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    compactMode: false
  };

  notificationSettings: NotificationSettings = {
    email: true,
    push: false,
    sms: false,
    frequency: 'daily'
  };

  privacySettings: PrivacySettings = {
    profileVisibility: 'public',
    showEmail: false,
    allowMessages: true
  };

  // Store setting IDs for updates
  settingIds: Record<string, string | null> = {
    theme: null,
    notifications: null,
    privacy: null
  };

  constructor(private apollo: Apollo) {}

  async ngOnInit() {
    await this.loadUserSettings();
  }

  async loadUserSettings() {
    try {
      this.loading = true;
      this.error = null;

      // Get current user
      const user = await getCurrentUser();
      this.currentUser = user;

      // Query user settings
      this.apollo.watchQuery({
        query: GET_USER_SETTINGS,
        variables: {
          entityId: user.userId,
          type: 'user'
        }
      }).valueChanges.subscribe({
        next: (result: any) => {
          if (result.data?.listSettings?.items) {
            const settings = result.data.listSettings.items;
            
            // Process each setting
            settings.forEach((setting: any) => {
              if (setting.key === 'theme') {
                this.themeSettings = { ...this.themeSettings, ...setting.value };
                this.settingIds['theme'] = setting.id;
              } else if (setting.key === 'notifications') {
                this.notificationSettings = { ...this.notificationSettings, ...setting.value };
                this.settingIds['notifications'] = setting.id;
              } else if (setting.key === 'privacy') {
                this.privacySettings = { ...this.privacySettings, ...setting.value };
                this.settingIds['privacy'] = setting.id;
              }
            });
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err.message;
          this.loading = false;
        }
      });
    } catch (err: any) {
      this.error = err.message;
      this.loading = false;
    }
  }

  // Update theme setting
  updateThemeSetting() {
    this.saveSetting('theme', this.themeSettings, 'Theme preferences updated');
  }

  // Update notification setting
  updateNotificationSetting() {
    this.saveSetting('notifications', this.notificationSettings, 'Notification preferences updated');
  }

  // Update privacy setting
  updatePrivacySetting() {
    this.saveSetting('privacy', this.privacySettings, 'Privacy settings updated');
  }

  // Generic save setting function
  async saveSetting(key: string, value: any, successMessage: string) {
    try {
      this.saveStatus = null;

      const settingInput = {
        type: 'user',
        key,
        value,
        entityId: this.currentUser.userId,
        description: `User ${key} preferences`,
        isActive: true
      };

      if (this.settingIds[key]) {
        // Update existing setting
        await this.apollo.mutate({
          mutation: UPDATE_SETTING,
          variables: {
            input: {
              id: this.settingIds[key],
              value
            }
          }
        }).toPromise();
      } else {
        // Create new setting
        const result = await this.apollo.mutate({
          mutation: CREATE_SETTING,
          variables: { input: settingInput }
        }).toPromise();
        
        if (result?.data) {
          const data = result.data as any;
          this.settingIds[key] = data.createSetting?.id;
        }
      }

      this.saveStatus = {
        type: 'success',
        message: successMessage
      };

      // Clear status after 3 seconds
      setTimeout(() => {
        this.saveStatus = null;
      }, 3000);

    } catch (err: any) {
      console.error(`Error saving ${key} setting:`, err);
      this.saveStatus = {
        type: 'error',
        message: `Failed to save ${key} settings`
      };
    }
  }
}
