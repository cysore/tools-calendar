/**
 * Performance Monitor - Advanced performance tracking for production
 */

import { logger } from './production-logger';

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  loadTime?: number;
  domContentLoaded?: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  
  // Navigation timing
  navigationTiming?: {
    redirectTime: number;
    dnsTime: number;
    connectTime: number;
    requestTime: number;
    responseTime: number;
    domProcessingTime: number;
    loadEventTime: number;
  };
  
  // Resource timing
  resourceTiming?: {
    totalResources: number;
    slowResources: Array<{
      name: string;
      duration: number;
      size?: number;
    }>;
  };
}

export interface PerformanceConfig {
  enableCoreWebVitals: boolean;
  enableResourceTiming: boolean;
  enableMemoryTracking: boolean;
  enableLongTaskTracking: boolean;
  reportingThreshold: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
    longTask: number;
  };
  sampleRate: number; // 0-1, percentage of sessions to monitor
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableCoreWebVitals: true,
      enableResourceTiming: true,
      enableMemoryTracking: true,
      enableLongTaskTracking: true,
      reportingThreshold: {
        fcp: 2000, // 2 seconds
        lcp: 2500, // 2.5 seconds
        fid: 100,  // 100ms
        cls: 0.1,  // 0.1 CLS score
        longTask: 50, // 50ms
      },
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      ...config,
    };

    // Only monitor a percentage of sessions to reduce overhead
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.initializeMonitoring();
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined' || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Wait for page load to start monitoring
    if (document.readyState === 'loading') {
      window.addEventListener('load', () => {
        setTimeout(() => this.startMonitoring(), 0);
      });
    } else {
      setTimeout(() => this.startMonitoring(), 0);
    }

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });

    // Report metrics before page unload
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  private startMonitoring() {
    if (this.config.enableCoreWebVitals) {
      this.monitorCoreWebVitals();
    }

    if (this.config.enableResourceTiming) {
      this.monitorResourceTiming();
    }

    if (this.config.enableMemoryTracking) {
      this.monitorMemoryUsage();
    }

    if (this.config.enableLongTaskTracking) {
      this.monitorLongTasks();
    }

    this.collectNavigationTiming();
  }

  private monitorCoreWebVitals() {
    // First Contentful Paint
    this.observePerformanceEntries('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.fcp = fcpEntry.startTime;
        if (fcpEntry.startTime > this.config.reportingThreshold.fcp) {
          logger.warn('Slow First Contentful Paint detected', {
            fcp: fcpEntry.startTime,
            threshold: this.config.reportingThreshold.fcp,
          });
        }
      }
    });

    // Largest Contentful Paint
    this.observePerformanceEntries('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1]; // Get the latest LCP
      if (lcpEntry) {
        this.metrics.lcp = lcpEntry.startTime;
        if (lcpEntry.startTime > this.config.reportingThreshold.lcp) {
          logger.warn('Slow Largest Contentful Paint detected', {
            lcp: lcpEntry.startTime,
            threshold: this.config.reportingThreshold.lcp,
          });
        }
      }
    });

    // First Input Delay
    this.observePerformanceEntries('first-input', (entries) => {
      const fidEntry = entries[0];
      if (fidEntry) {
        this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
        if (this.metrics.fid > this.config.reportingThreshold.fid) {
          logger.warn('High First Input Delay detected', {
            fid: this.metrics.fid,
            threshold: this.config.reportingThreshold.fid,
          });
        }
      }
    });

    // Cumulative Layout Shift
    this.observePerformanceEntries('layout-shift', (entries) => {
      let clsScore = 0;
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value;
        }
      });
      
      this.metrics.cls = clsScore;
      if (clsScore > this.config.reportingThreshold.cls) {
        logger.warn('High Cumulative Layout Shift detected', {
          cls: clsScore,
          threshold: this.config.reportingThreshold.cls,
        });
      }
    });
  }

  private monitorResourceTiming() {
    this.observePerformanceEntries('resource', (entries) => {
      const slowResources: Array<{ name: string; duration: number; size?: number }> = [];
      
      entries.forEach(entry => {
        const resourceEntry = entry as PerformanceResourceTiming;
        const duration = resourceEntry.responseEnd - resourceEntry.startTime;
        
        // Flag slow resources (>1 second)
        if (duration > 1000) {
          slowResources.push({
            name: resourceEntry.name,
            duration,
            size: resourceEntry.transferSize,
          });
        }
      });

      if (slowResources.length > 0) {
        this.metrics.resourceTiming = {
          totalResources: entries.length,
          slowResources,
        };

        logger.warn('Slow resources detected', {
          slowResources,
          totalResources: entries.length,
        });
      }
    });
  }

  private monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };

      // Check for memory pressure
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercentage > 80) {
        logger.warn('High memory usage detected', {
          usagePercentage,
          memoryUsage: this.metrics.memoryUsage,
        });
      }
    }
  }

  private monitorLongTasks() {
    this.observePerformanceEntries('longtask', (entries) => {
      entries.forEach(entry => {
        if (entry.duration > this.config.reportingThreshold.longTask) {
          logger.warn('Long task detected', {
            duration: entry.duration,
            startTime: entry.startTime,
            threshold: this.config.reportingThreshold.longTask,
          });
        }
      });
    });
  }

  private collectNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
      this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;

      this.metrics.navigationTiming = {
        redirectTime: navigation.redirectEnd - navigation.redirectStart,
        dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
        connectTime: navigation.connectEnd - navigation.connectStart,
        requestTime: navigation.responseStart - navigation.requestStart,
        responseTime: navigation.responseEnd - navigation.responseStart,
        domProcessingTime: navigation.domContentLoadedEventStart - navigation.responseEnd,
        loadEventTime: navigation.loadEventEnd - navigation.loadEventStart,
      };
    }
  }

  private observePerformanceEntries(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      logger.debug(`Performance observer for ${entryType} not supported`, { error });
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public reportMetrics() {
    if (Object.keys(this.metrics).length === 0) {
      return;
    }

    logger.info('Performance metrics report', {
      metrics: this.metrics,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    // Reset metrics after reporting
    this.metrics = {};
  }

  public measureCustomMetric(name: string, startTime?: number): () => void {
    const start = startTime || performance.now();
    
    return () => {
      const duration = performance.now() - start;
      logger.info(`Custom metric: ${name}`, {
        duration,
        name,
      });
    };
  }

  public markCustomEvent(name: string, context?: Record<string, any>) {
    performance.mark(name);
    logger.info(`Performance mark: ${name}`, context);
  }

  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export const perf = {
  measure: (name: string, startTime?: number) => performanceMonitor.measureCustomMetric(name, startTime),
  mark: (name: string, context?: Record<string, any>) => performanceMonitor.markCustomEvent(name, context),
  getMetrics: () => performanceMonitor.getMetrics(),
  report: () => performanceMonitor.reportMetrics(),
};