'use client';

import { useEffect } from 'react';
import {
  initServiceWorker,
  precacheResources,
} from '@/lib/performance/sw-registration';
import { preloadCriticalComponents } from '@/lib/performance/lazy-components';

export function PerformanceInitializer() {
  useEffect(() => {
    // 初始化 Service Worker
    initServiceWorker();

    // 预加载关键组件
    preloadCriticalComponents();

    // 预缓存关键资源
    const criticalResources = ['/api/auth/me', '/api/teams', '/manifest.json'];
    precacheResources(criticalResources);

    // 性能监控
    if (typeof window !== 'undefined' && 'performance' in window) {
      // 监控页面加载性能
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming;
          if (navigation) {
            const loadTime =
              navigation.loadEventEnd - navigation.loadEventStart;
            const domContentLoaded =
              navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart;

            console.log('Performance Metrics:', {
              loadTime: `${loadTime.toFixed(2)}ms`,
              domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
              firstContentfulPaint: getFirstContentfulPaint(),
              largestContentfulPaint: getLargestContentfulPaint(),
            });
          }
        }, 0);
      });

      // 监控资源加载
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              console.warn(
                `Slow resource: ${resourceEntry.name} took ${resourceEntry.duration.toFixed(2)}ms`
              );
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      // 监控长任务
      if ('PerformanceObserver' in window) {
        try {
          const longTaskObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              console.warn(
                `Long task detected: ${entry.duration.toFixed(2)}ms`
              );
            }
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // longtask 可能不被支持
        }
      }
    }

    // 内存监控
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

        if (usedMB > 100) {
          console.warn(
            `High memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`
          );
        }
      };

      // 每分钟检查一次内存使用
      const memoryInterval = setInterval(checkMemory, 60000);

      return () => {
        clearInterval(memoryInterval);
      };
    }
  }, []);

  return null;
}

// 获取 First Contentful Paint
function getFirstContentfulPaint(): string {
  const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
  return fcpEntry ? `${fcpEntry.startTime.toFixed(2)}ms` : 'N/A';
}

// 获取 Largest Contentful Paint
function getLargestContentfulPaint(): string {
  return new Promise<string>(resolve => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(`${lastEntry.startTime.toFixed(2)}ms`);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        // 超时处理
        setTimeout(() => {
          observer.disconnect();
          resolve('N/A');
        }, 5000);
      } catch (e) {
        resolve('N/A');
      }
    } else {
      resolve('N/A');
    }
  })
    .then(result => result)
    .catch(() => 'N/A') as any;
}
