import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_POST_SETTINGS, CREATE_SETTING, UPDATE_SETTING } from '../graphql/settings';

interface PostSettingsProps {
  postId: string;
}

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

const PostSettings: React.FC<PostSettingsProps> = ({ postId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);

  // Settings state
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>({
    isPublic: true,
    allowComments: true,
    allowSharing: true,
    moderationLevel: 'auto'
  });

  const [formattingSettings, setFormattingSettings] = useState<FormattingSettings>({
    allowMarkdown: true,
    autoLinkUrls: true,
    allowImages: true,
    maxLength: 5000
  });

  const [seoSettings, setSeoSettings] = useState<SeoSettings>({
    allowIndexing: true,
    generateMetaTags: true,
    socialPreview: true
  });

  // Setting IDs for updates
  const [settingIds, setSettingIds] = useState<{[key: string]: string | null}>({
    visibility: null,
    formatting: null,
    seo: null
  });

  // GraphQL mutations
  const [createSetting] = useMutation(CREATE_SETTING);
  const [updateSetting] = useMutation(UPDATE_SETTING);

  // Load post settings
  const { data: settingsData, refetch } = useQuery(GET_POST_SETTINGS, {
    variables: { entityId: postId },
    skip: !postId,
    onCompleted: (data) => {
      if (data?.listSettings?.items) {
        const settings = data.listSettings.items;
        
        settings.forEach((setting: any) => {
          if (setting.key === 'visibility') {
            setVisibilitySettings({ ...visibilitySettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, visibility: setting.id }));
          } else if (setting.key === 'formatting') {
            setFormattingSettings({ ...formattingSettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, formatting: setting.id }));
          } else if (setting.key === 'seo') {
            setSeoSettings({ ...seoSettings, ...setting.value });
            setSettingIds(prev => ({ ...prev, seo: setting.id }));
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

  // Reload settings when postId changes
  useEffect(() => {
    if (postId) {
      setLoading(true);
      refetch();
    }
  }, [postId, refetch]);

  // Generic save setting function
  const saveSetting = async (key: string, value: any, successMessage: string) => {
    try {
      setSaveStatus(null);

      const settingInput = {
        type: 'post',
        key,
        value,
        entityId: postId,
        description: `Post ${key} settings`,
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
  const updateVisibilitySetting = () => {
    saveSetting('visibility', visibilitySettings, 'Visibility settings updated');
  };

  const updateFormattingSetting = () => {
    saveSetting('formatting', formattingSettings, 'Formatting settings updated');
  };

  const updateSeoSetting = () => {
    saveSetting('seo', seoSettings, 'SEO settings updated');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading post settings</h3>
            <div className="mt-2 text-sm text-red-700">{error.message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-settings max-w-2xl">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Post Settings</h2>
          <span className="text-sm text-gray-500">Post ID: {postId}</span>
        </div>
        
        <div className="space-y-6">
          {/* Visibility Settings */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visibility & Access</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Public Post</label>
                  <p className="text-sm text-gray-500">Make this post visible to everyone</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={visibilitySettings.isPublic}
                  onChange={(e) => {
                    setVisibilitySettings({ ...visibilitySettings, isPublic: e.target.checked });
                    setTimeout(updateVisibilitySetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Allow Comments</label>
                  <p className="text-sm text-gray-500">Let users comment on this post</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={visibilitySettings.allowComments}
                  onChange={(e) => {
                    setVisibilitySettings({ ...visibilitySettings, allowComments: e.target.checked });
                    setTimeout(updateVisibilitySetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Allow Sharing</label>
                  <p className="text-sm text-gray-500">Allow users to share this post</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={visibilitySettings.allowSharing}
                  onChange={(e) => {
                    setVisibilitySettings({ ...visibilitySettings, allowSharing: e.target.checked });
                    setTimeout(updateVisibilitySetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Moderation Level</label>
                <select 
                  value={visibilitySettings.moderationLevel}
                  onChange={(e) => {
                    setVisibilitySettings({ ...visibilitySettings, moderationLevel: e.target.value });
                    setTimeout(updateVisibilitySetting, 100);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Moderation</option>
                  <option value="auto">Auto Moderation</option>
                  <option value="manual">Manual Review</option>
                  <option value="strict">Strict Filtering</option>
                </select>
              </div>
            </div>
          </div>

          {/* Formatting Settings */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Content & Formatting</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Allow Markdown</label>
                  <p className="text-sm text-gray-500">Enable markdown formatting in content</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formattingSettings.allowMarkdown}
                  onChange={(e) => {
                    setFormattingSettings({ ...formattingSettings, allowMarkdown: e.target.checked });
                    setTimeout(updateFormattingSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Auto-link URLs</label>
                  <p className="text-sm text-gray-500">Automatically convert URLs to links</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formattingSettings.autoLinkUrls}
                  onChange={(e) => {
                    setFormattingSettings({ ...formattingSettings, autoLinkUrls: e.target.checked });
                    setTimeout(updateFormattingSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Allow Images</label>
                  <p className="text-sm text-gray-500">Allow image uploads in content</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={formattingSettings.allowImages}
                  onChange={(e) => {
                    setFormattingSettings({ ...formattingSettings, allowImages: e.target.checked });
                    setTimeout(updateFormattingSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Content Length</label>
                <input 
                  type="number" 
                  value={formattingSettings.maxLength}
                  onChange={(e) => {
                    setFormattingSettings({ ...formattingSettings, maxLength: parseInt(e.target.value) });
                    setTimeout(updateFormattingSetting, 100);
                  }}
                  min={100} 
                  max={50000}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO & Discovery</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Search Engine Indexing</label>
                  <p className="text-sm text-gray-500">Allow search engines to index this post</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={seoSettings.allowIndexing}
                  onChange={(e) => {
                    setSeoSettings({ ...seoSettings, allowIndexing: e.target.checked });
                    setTimeout(updateSeoSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Generate Meta Tags</label>
                  <p className="text-sm text-gray-500">Auto-generate meta description and tags</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={seoSettings.generateMetaTags}
                  onChange={(e) => {
                    setSeoSettings({ ...seoSettings, generateMetaTags: e.target.checked });
                    setTimeout(updateSeoSetting, 100);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Social Media Preview</label>
                  <p className="text-sm text-gray-500">Generate preview for social media sharing</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={seoSettings.socialPreview}
                  onChange={(e) => {
                    setSeoSettings({ ...seoSettings, socialPreview: e.target.checked });
                    setTimeout(updateSeoSetting, 100);
                  }}
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

export default PostSettings;
