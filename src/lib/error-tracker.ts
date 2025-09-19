/**
 * Error Tracker - Advanced error tracking and reporting for production
 */

import { logger } from './production-logger';
import { performanceMonitor } from './performance-monitor';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  component?: string;
  action?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  breadcrumbs?: Breadcrumb[];
  performance?: any;
  tags?: Record<string, string>;
}

export interface Breadcrumb {
  timestamp: string;
  category: 'navigation' | 'user' | 'api' | 'console' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  name: string;
  message: string;
  stack?: string;
  fingerprint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

export interface ErrorTrackerConfig {
  enableBreadcrumbs: boolean;
  enablePerformanceContext: boolean;
  enableStackTrace: boolean;
  maxBreadcrumbs: number;
  enableAutoCapture: boolean;
  enableConsoleCapture: boolean;
  enableNetworkCapture: boolean;
  sampleRate: number;
  beforeSend?: (error: ErrorReport) => ErrorReport | null;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private config: ErrorTrackerConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private errorCounts: Map<string, number> = new Map();
  private sessionId: string;
  private isInitialized = false;

  private constructor(config: Partial<ErrorTrackerConfig> = {}) {
    this.config = {
      enableBreadcrumbs: true,
      enablePerformanceContext: true,
      enableStackTrace: true,
      maxBreadcrumbs: 50,
      enableAutoCapture: true,
      enableConsoleCapture: process.env.NODE_ENV === 'production',
      enableNetworkCapture: true,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      ...config,
    };

    this.sessionId = this.generateSessionId();

    // Only track errors for a percentage of sessions
    if (Math.random() <= this.config.sampleRate) {
      this.initialize();
    }
  }

  static getInstance(config?: Partial<ErrorTrackerConfig>): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker(config);
    }
    return ErrorTracker.instance;
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    if (this.config.enableAutoCapture) {
      this.setupGlobalErrorHandlers();
    }

    if (this.config.enableBreadcrumbs) {
      this.setupBreadcrumbCapture();
    }

    // Add initial breadcrumb
    this.addBreadcrumb({
      category: 'navigation',
      message: 'Error tracker initialized',
      level: 'info',
      data: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  }

  private generateSessionId(): string {
    return `error_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers() {
    // Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        component: 'global',
        action: 'unhandled_error',
        props: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'global',
          action: 'unhandled_promise_rejection',
        }
      );
    });

    // Capture console errors if enabled
    if (this.config.enableConsoleCapture) {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        this.addBreadcrumb({
          category: 'console',
          message: args.join(' '),
          level: 'error',
        });
        originalConsoleError.apply(console, args);
      };
    }
  }

  private setupBreadcrumbCapture() {
    // Capture navigation events
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      ErrorTracker.instance.addBreadcrumb({
        category: 'navigation',
        message: `Navigation to ${args[2]}`,
        level: 'info',
        data: { url: args[2] },
      });
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      ErrorTracker.instance.addBreadcrumb({
        category: 'navigation',
        message: `Navigation replaced to ${args[2]}`,
        level: 'info',
        data: { url: args[2] },
      });
      return originalReplaceState.apply(history, args);
    };

    // Capture click events
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.addBreadcrumb({
          category: 'user',
          message: `Clicked ${target.tagName}`,
          level: 'info',
          data: {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            textContent: target.textContent?.slice(0, 100),
          },
        });
      }
    });

    // Capture network requests if enabled
    if (this.config.enableNetworkCapture) {
      this.setupNetworkCapture();
    }
  }

  private setupNetworkCapture() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.addBreadcrumb({
          category: 'api',
          message: `${args[1]?.method || 'GET'} ${url}`,
          level: response.ok ? 'info' : 'warning',
          data: {
            status: response.status,
            duration,
            url,
          },
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.addBreadcrumb({
          category: 'api',
          message: `${args[1]?.method || 'GET'} ${url} failed`,
          level: 'error',
          data: {
            duration,
            url,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        
        throw error;
      }
    };
  }

  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    if (!this.config.enableBreadcrumbs) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  public captureError(
    error: Error,
    context: Partial<ErrorContext> = {}
  ): string {
    const errorId = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error);
    
    // Count occurrences
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);

    const errorReport: ErrorReport = {
      id: errorId,
      name: error.name,
      message: error.message,
      stack: this.config.enableStackTrace ? error.stack : undefined,
      fingerprint,
      severity: this.determineSeverity(error, context),
      context: this.enrichContext(context),
      occurrences: currentCount + 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    // Apply beforeSend hook if configured
    const processedError = this.config.beforeSend ? this.config.beforeSend(errorReport) : errorReport;
    
    if (processedError) {
      this.sendErrorReport(processedError);
    }

    return errorId;
  }

  public captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context: Partial<ErrorContext> = {}
  ): string {
    const error = new Error(message);
    error.name = 'CapturedMessage';
    
    return this.captureError(error, {
      ...context,
      tags: {
        ...context.tags,
        level,
      },
    });
  }

  public setContext(context: Partial<ErrorContext>) {
    // Store context for future errors
    if (typeof window !== 'undefined') {
      (window as any).__errorTrackerContext = {
        ...(window as any).__errorTrackerContext,
        ...context,
      };
    }
  }

  public setTag(key: string, value: string) {
    this.setContext({
      tags: {
        ...((window as any).__errorTrackerContext?.tags || {}),
        [key]: value,
      },
    });
  }

  public setUser(userId: string) {
    this.setContext({ userId });
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error name, message, and stack trace
    const stackLines = error.stack?.split('\n').slice(0, 3).join('') || '';
    const content = `${error.name}:${error.message}:${stackLines}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private determineSeverity(error: Error, context: Partial<ErrorContext>): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'critical';
    }
    
    if (error.name === 'SecurityError' || context.component === 'auth') {
      return 'critical';
    }

    // High severity errors
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'high';
    }

    if (context.action === 'api_call' && error.message.includes('500')) {
      return 'high';
    }

    // Medium severity errors
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  private enrichContext(context: Partial<ErrorContext>): ErrorContext {
    const globalContext = typeof window !== 'undefined' 
      ? (window as any).__errorTrackerContext || {}
      : {};

    return {
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
      breadcrumbs: this.config.enableBreadcrumbs ? [...this.breadcrumbs] : undefined,
      performance: this.config.enablePerformanceContext 
        ? performanceMonitor.getMetrics() 
        : undefined,
      ...globalContext,
      ...context,
      tags: {
        ...globalContext.tags,
        ...context.tags,
      },
    };
  }

  private sendErrorReport(errorReport: ErrorReport) {
    // Log the error
    logger.error('Error captured', undefined, {
      errorReport,
      breadcrumbs: errorReport.context.breadcrumbs?.slice(-5), // Only send last 5 breadcrumbs
    });

    // Send to external error tracking service if configured
    // This could be Sentry, Bugsnag, Rollbar, etc.
    if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      }).catch(err => {
        console.error('Failed to send error report:', err);
      });
    }
  }

  public getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      uniqueErrors: this.errorCounts.size,
      sessionId: this.sessionId,
      breadcrumbsCount: this.breadcrumbs.length,
    };
  }

  public clearBreadcrumbs() {
    this.breadcrumbs = [];
  }

  public destroy() {
    this.breadcrumbs = [];
    this.errorCounts.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Convenience functions
export const captureError = (error: Error, context?: Partial<ErrorContext>) => 
  errorTracker.captureError(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: Partial<ErrorContext>) => 
  errorTracker.captureMessage(message, level, context);

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => 
  errorTracker.addBreadcrumb(breadcrumb);

export const setErrorContext = (context: Partial<ErrorContext>) => 
  errorTracker.setContext(context);

export const setErrorTag = (key: string, value: string) => 
  errorTracker.setTag(key, value);

export const setErrorUser = (userId: string) => 
  errorTracker.setUser(userId);