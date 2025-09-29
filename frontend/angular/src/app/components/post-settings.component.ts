import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import { GET_POST_SETTINGS, CREATE_SETTING, UPDATE_SETTING } from '../graphql/settings';

interface VisibilitySettings {
  isPublic: boolean;
  allowComments: boolean;
  allowSharing: boolean;
  moderationLevel: string;
}

interface FormattingSettings {
  allowMarkdown: boolean;
  autoLinkUrls: boolean;
  allowImages: boolean;
  maxLength: number;
}

interface SeoSettings {
  allowIndexing: boolean;
  generateMetaTags: boolean;
  socialPreview: boolean;
}

interface SaveStatus {
  type: 'success' | 'error';
  message: string;
}

@Component({
  selector: 'app-post-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="post-settings max-w-2xl">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Post Settings</h2>
          <span class="text-sm text-gray-500">Post ID: {{ postId }}</span>
        </div>
        
        <!-- Loading State -->
        <div *ngIf="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error loading post settings</h3>
              <div class="mt-2 text-sm text-red-700">{{ error }}</div>
            </div>
          </div>
        </div>

        <!-- Settings Form -->
        <div *ngIf="!loading" class="space-y-6">
          <!-- Visibility Settings -->
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Visibility & Access</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Public Post</label>
                  <p class="text-sm text-gray-500">Make this post visible to everyone</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="visibilitySettings.isPublic" 
                  (change)="updateVisibilitySetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Allow Comments</label>
                  <p class="text-sm text-gray-500">Let users comment on this post</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="visibilitySettings.allowComments" 
                  (change)="updateVisibilitySetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Allow Sharing</label>
                  <p class="text-sm text-gray-500">Allow users to share this post</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="visibilitySettings.allowSharing" 
                  (change)="updateVisibilitySetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Moderation Level</label>
                <select 
                  [(ngModel)]="visibilitySettings.moderationLevel" 
                  (change)="updateVisibilitySetting()"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Moderation</option>
                  <option value="auto">Auto Moderation</option>
                  <option value="manual">Manual Review</option>
                  <option value="strict">Strict Filtering</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Formatting Settings -->
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Content & Formatting</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Allow Markdown</label>
                  <p class="text-sm text-gray-500">Enable markdown formatting in content</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formattingSettings.allowMarkdown" 
                  (change)="updateFormattingSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Auto-link URLs</label>
                  <p class="text-sm text-gray-500">Automatically convert URLs to links</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formattingSettings.autoLinkUrls" 
                  (change)="updateFormattingSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Allow Images</label>
                  <p class="text-sm text-gray-500">Allow image uploads in content</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formattingSettings.allowImages" 
                  (change)="updateFormattingSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Maximum Content Length</label>
                <input 
                  type="number" 
                  [(ngModel)]="formattingSettings.maxLength" 
                  (change)="updateFormattingSetting()"
                  min="100" 
                  max="50000"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- SEO Settings -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">SEO & Discovery</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Search Engine Indexing</label>
                  <p class="text-sm text-gray-500">Allow search engines to index this post</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="seoSettings.allowIndexing" 
                  (change)="updateSeoSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Generate Meta Tags</label>
                  <p class="text-sm text-gray-500">Auto-generate meta description and tags</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="seoSettings.generateMetaTags" 
                  (change)="updateSeoSetting()"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-900">Social Media Preview</label>
                  <p class="text-sm text-gray-500">Generate preview for social media sharing</p>
                </div>
                <input 
                  type="checkbox" 
                  [(ngModel)]="seoSettings.socialPreview" 
                  (change)="updateSeoSetting()"
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
    .post-settings {
      max-width: 600px;
    }
  `]
})
export class PostSettingsComponent implements OnInit, OnChanges {
  @Input() postId!: string;

  loading = true;
  error: string | null = null;
  saveStatus: SaveStatus | null = null;

  // Settings data
  visibilitySettings: VisibilitySettings = {
    isPublic: true,
    allowComments: true,
    allowSharing: true,
    moderationLevel: 'auto'
  };

  formattingSettings: FormattingSettings = {
    allowMarkdown: true,
    autoLinkUrls: true,
    allowImages: true,
    maxLength: 5000
  };

  seoSettings: SeoSettings = {
    allowIndexing: true,
    generateMetaTags: true,
    socialPreview: true
  };

  // Store setting IDs for updates
  settingIds: Record<string, string | null> = {
    visibility: null,
    formatting: null,
    seo: null
  };

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    if (this.postId) {
      this.loadPostSettings();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['postId'] && this.postId) {
      this.loadPostSettings();
    }
  }

  async loadPostSettings() {
    try {
      this.loading = true;
      this.error = null;

      // Query post settings
      this.apollo.watchQuery({
        query: GET_POST_SETTINGS,
        variables: { entityId: this.postId }
      }).valueChanges.subscribe({
        next: (result: any) => {
          if (result.data?.listSettings?.items) {
            const settings = result.data.listSettings.items;
            
            // Process each setting
            settings.forEach((setting: any) => {
              if (setting.key === 'visibility') {
                this.visibilitySettings = { ...this.visibilitySettings, ...setting.value };
                this.settingIds['visibility'] = setting.id;
              } else if (setting.key === 'formatting') {
                this.formattingSettings = { ...this.formattingSettings, ...setting.value };
                this.settingIds['formatting'] = setting.id;
              } else if (setting.key === 'seo') {
                this.seoSettings = { ...this.seoSettings, ...setting.value };
                this.settingIds['seo'] = setting.id;
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

  // Update visibility setting
  updateVisibilitySetting() {
    this.saveSetting('visibility', this.visibilitySettings, 'Visibility settings updated');
  }

  // Update formatting setting
  updateFormattingSetting() {
    this.saveSetting('formatting', this.formattingSettings, 'Formatting settings updated');
  }

  // Update SEO setting
  updateSeoSetting() {
    this.saveSetting('seo', this.seoSettings, 'SEO settings updated');
  }

  // Generic save setting function
  async saveSetting(key: string, value: any, successMessage: string) {
    try {
      this.saveStatus = null;

      const settingInput = {
        type: 'post',
        key,
        value,
        entityId: this.postId,
        description: `Post ${key} settings`,
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
