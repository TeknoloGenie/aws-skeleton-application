import { onMounted } from 'vue';
import { analytics } from '../services/analytics';

export const useAnalytics = (componentName: string) => {
  onMounted(() => {
    // Track component view
    analytics.trackView(componentName);
  });

  const trackAction = (action: string, metadata?: Record<string, any>) => {
    analytics.trackAction(action, componentName, metadata);
  };

  const trackError = (error: string, metadata?: Record<string, any>) => {
    analytics.trackError(error, componentName, metadata);
  };

  return {
    trackAction,
    trackError
  };
};
