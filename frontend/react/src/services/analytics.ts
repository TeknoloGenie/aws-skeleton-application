import { useEffect, useRef } from 'react';
import { apolloClient } from '../graphql/client';
import { gql } from '@apollo/client';

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
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the analytics service (called lazily)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics Service: Starting initialization...');
      }

      await this.loadSystemSettings();
      this.startBatchProcessor();
      this.isInitialized = true;

      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics Service: Initialization completed successfully');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Analytics Service: Failed to initialize, using defaults:', error);
      }
      // Use defaults and continue
      this.startBatchProcessor();
      this.isInitialized = true;
    }
  }

  /**
   * Load system settings for batch configuration
   */
  private async loadSystemSettings() {
    try {
      const SYSTEM_SETTINGS_QUERY = gql`
        query GetSystemSettings {
          listSettings {
            id
            key
            value
            isActive
          }
        }
      `;

      const result = await apolloClient.query({
        query: SYSTEM_SETTINGS_QUERY,
        fetchPolicy: 'cache-first',
        errorPolicy: 'all'
      });

      if (result.data && result.data.listSettings) {
        const settings = result.data.listSettings || [];
        
        settings.forEach((setting: any) => {
          if (!setting.isActive) return;
          
          switch (setting.key) {
            case 'batch_log_size':
              this.batchSize = parseInt(setting.value) || 50;
              break;
            case 'batch_log_interval':
              this.batchInterval = (parseInt(setting.value) || 5) * 1000;
              break;
          }
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(`Analytics configured: batch size ${this.batchSize}, interval ${this.batchInterval}ms`);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load system settings, using defaults:', error);
      }
      // Continue with defaults - this is not a critical failure
    }
  }

  /**
   * Set current user ID for analytics
   */
  async setUserId(userId: string) {
    this.currentUserId = userId;
    
    // Initialize the service when user is set
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Track an analytics event
   */
  async track(action: string, component: string, level: 'info' | 'warn' | 'error' = 'info', metadata?: Record<string, any>) {
    if (!this.currentUserId) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Analytics: No user ID set, skipping event');
      }
      return;
    }

    // Ensure service is initialized
    await this.initialize();

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
  async trackView(component: string, metadata?: Record<string, any>) {
    await this.track('view', component, 'info', metadata);
  }

  /**
   * Track user action
   */
  async trackAction(action: string, component: string, metadata?: Record<string, any>) {
    await this.track(action, component, 'info', metadata);
  }

  /**
   * Track error
   */
  async trackError(error: string, component: string, metadata?: Record<string, any>) {
    await this.track(error, component, 'error', {
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
    if (this.batchTimer) {
      return; // Already started
    }

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
      const CREATE_LOG_MUTATION = gql`
        mutation CreateLog($input: CreateLogInput!) {
          createLog(input: $input) {
            id
            createdAt
          }
        }
      `;

      // Process events one by one since we don't have a batch mutation
      for (const event of batch) {
        try {
          await apolloClient.mutate({
            mutation: CREATE_LOG_MUTATION,
            variables: { 
              input: {
                userId: event.userId,
                action: event.action,
                component: event.component,
                level: event.level,
                metadata: JSON.stringify(event.metadata)
              }
            },
            errorPolicy: 'all'
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Analytics: Failed to create log entry:', error);
          }
          // Continue processing other events
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Analytics: Processed batch of ${batch.length} events`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Analytics: Failed to process batch:', error);
      }
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
 * React hook for analytics
 */
export function useAnalytics(componentName: string) {
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current) {
      analytics.trackView(componentName);
      hasTrackedView.current = true;
    }

    return () => {
      // Cleanup on unmount
    };
  }, [componentName]);

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
}