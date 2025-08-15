import { ref, onMounted, onUnmounted } from 'vue';
import { apolloClient } from '../graphql/client';
import { gql } from '@apollo/client/core';

interface AnalyticsEvent {
  userId: string;
  action: string;
  component: string;
  level: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null;
  private batchSize = 50;
  private batchInterval = 5000; // 5 seconds
  private isProcessing = false;

  constructor() {
    this.loadSystemSettings();
    this.startBatchProcessor();
  }

  /**
   * Load system settings for batch configuration
   */
  private async loadSystemSettings() {
    try {
      const SYSTEM_SETTINGS_QUERY = gql`
        query GetSystemSettings {
          listSettings(filter: { type: { eq: "SYSTEM" }, entityId: { eq: "GLOBAL" } }) {
            id
            key
            value
            isActive
          }
        }
      `;

      const result = await apolloClient.query({
        query: SYSTEM_SETTINGS_QUERY,
        fetchPolicy: 'cache-first'
      });

      const settings = result.data.listSettings || [];
      
      settings.forEach((setting: any) => {
        if (!setting.isActive) return;
        
        switch (setting.key) {
          case 'batch_log_size':
            this.batchSize = setting.value.count || 50;
            break;
          case 'batch_log_interval':
            this.batchInterval = (setting.value.seconds || 5) * 1000;
            break;
        }
      });

      console.log(`Analytics configured: batch size ${this.batchSize}, interval ${this.batchInterval}ms`);
    } catch (error) {
      console.warn('Failed to load system settings, using defaults:', error);
    }
  }

  /**
   * Set current user ID for analytics
   */
  setUserId(userId: string) {
    this.currentUserId = userId;
  }

  /**
   * Track an analytics event
   */
  track(action: string, component: string, level: 'info' | 'warn' | 'error' = 'info', metadata?: Record<string, any>) {
    if (!this.currentUserId) {
      console.warn('Analytics: No user ID set, skipping event');
      return;
    }

    const event: AnalyticsEvent = {
      userId: this.currentUserId,
      action,
      component,
      level,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    this.eventQueue.push(event);

    // Process immediately if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Track component view
   */
  trackView(component: string, metadata?: Record<string, any>) {
    this.track('view', component, 'info', metadata);
  }

  /**
   * Track user action
   */
  trackAction(action: string, component: string, metadata?: Record<string, any>) {
    this.track(action, component, 'info', metadata);
  }

  /**
   * Track error
   */
  trackError(error: string, component: string, metadata?: Record<string, any>) {
    this.track(error, component, 'error', {
      ...metadata,
      errorMessage: error,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processBatch();
      }
    }, this.batchInterval);
  }

  /**
   * Process batch of events
   */
  private async processBatch() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.eventQueue.splice(0, this.batchSize);

    try {
      const CREATE_LOGS_MUTATION = gql`
        mutation CreateLogs($logs: [CreateLogInput!]!) {
          createLogs(logs: $logs) {
            id
            createdAt
          }
        }
      `;

      const logInputs = batch.map(event => ({
        userId: event.userId,
        action: event.action,
        component: event.component,
        level: event.level,
        metadata: event.metadata
      }));

      await apolloClient.mutate({
        mutation: CREATE_LOGS_MUTATION,
        variables: { logs: logInputs }
      });

      console.log(`Analytics: Processed batch of ${batch.length} events`);
    } catch (error) {
      console.error('Analytics: Failed to process batch:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Flush all pending events
   */
  async flush() {
    if (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.flush();
  }
}

// Global analytics instance
export const analytics = new AnalyticsService();

/**
 * Vue composable for analytics
 */
export function useAnalytics(componentName: string) {
  const isTracking = ref(false);

  onMounted(() => {
    analytics.trackView(componentName);
    isTracking.value = true;
  });

  onUnmounted(() => {
    isTracking.value = false;
  });

  const trackAction = (action: string, metadata?: Record<string, any>) => {
    analytics.trackAction(action, componentName, metadata);
  };

  const trackError = (error: string, metadata?: Record<string, any>) => {
    analytics.trackError(error, componentName, metadata);
  };

  return {
    isTracking,
    trackAction,
    trackError
  };
}