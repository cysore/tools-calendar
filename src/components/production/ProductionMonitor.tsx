'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/production-logger';
import { performanceMonitor } from '@/lib/performance-monitor';
import { errorTracker, setErrorUser, setErrorTag } from '@/lib/error-tracker';

/**
 * ProductionMonitor - Initializes all production monitoring systems
 * This component should be included in the root layout
 */
export function ProductionMonitor() {
  const { data: session } = useSession();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Initialize monitoring systems
    logger.info('Production monitoring initialized', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Set up error context
    setErrorTag('environment', process.env.NODE_ENV || 'unknown');
    setErrorTag('version', process.env.NEXT_PUBLIC_APP_VERSION || 'unknown');

    // Monitor page visibility for analytics
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logger.info('Page hidden', {
          url: window.location.href,
          timeOnPage: performance.now(),
        });
        performanceMonitor.reportMetrics();
      } else {
        logger.info('Page visible', {
          url: window.location.href,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Monitor network status
    const handleOnline = () => {
      logger.info('Network connection restored');
      setErrorTag('networkStatus', 'online');
    };

    const handleOffline = () => {
      logger.warn('Network connection lost');
      setErrorTag('networkStatus', 'offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial network status
    setErrorTag('networkStatus', navigator.onLine ? 'online' : 'offline');

    // Monitor memory pressure (if supported)
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memory = (performance as any).memory;
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercentage > 90) {
          logger.critical('Critical memory usage detected', undefined, {
            memoryUsage: {
              used: memory.usedJSHeapSize,
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit,
              usagePercentage,
            },
          });
        } else if (usagePercentage > 75) {
          logger.warn('High memory usage detected', {
            memoryUsage: {
              used: memory.usedJSHeapSize,
              total: memory.totalJSHeapSize,
              limit: memory.jsHeapSizeLimit,
              usagePercentage,
            },
          });
        }
      };

      // Check memory every 30 seconds
      const memoryInterval = setInterval(checkMemoryPressure, 30000);

      return () => {
        clearInterval(memoryInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update user context when session changes
  useEffect(() => {
    if (session?.user) {
      setErrorUser(session.user.id!);
      setErrorTag('userRole', 'authenticated');
      
      logger.info('User session established', {
        userId: session.user.id,
        email: session.user.email,
      });
    } else {
      setErrorTag('userRole', 'anonymous');
      
      logger.info('User session ended or not authenticated');
    }
  }, [session]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for logging user actions in components
 */
export function useProductionLogging() {
  const logUserAction = (action: string, component: string, context?: Record<string, any>) => {
    logger.logUserAction(action, component, context);
  };

  const logApiCall = (method: string, url: string, duration: number, status: number, context?: Record<string, any>) => {
    logger.logApiCall(method, url, duration, status, context);
  };

  const measurePerformance = (name: string) => {
    return performanceMonitor.measureCustomMetric(name);
  };

  const markPerformanceEvent = (name: string, context?: Record<string, any>) => {
    performanceMonitor.markCustomEvent(name, context);
  };

  return {
    logUserAction,
    logApiCall,
    measurePerformance,
    markPerformanceEvent,
  };
}