import { useEffect } from 'react';
import { analytics } from '../services/analytics';

export const useAnalytics = (componentName: string) => {
  useEffect(() => {
    // Register component with analytics service
    analytics.registerComponent?.(componentName);
  }, [componentName]);

  const trackAction = (action: string, metadata?: Record<string, unknown>) => {
    analytics.trackAction(action, componentName, metadata);
  };

  const trackError = (error: string, metadata?: Record<string, unknown>) => {
    analytics.trackError(error, componentName, metadata);
  };

  return {
    trackAction,
    trackError
  };
};
