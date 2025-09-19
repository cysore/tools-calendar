'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  optimizedFetch,
  apiCache,
  cacheInvalidation,
} from '@/lib/performance/api-cache';

// 防抖 Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 节流 Hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

// 优化的 API 请求 Hook
interface UseOptimizedFetchOptions {
  cache?: boolean;
  cacheTTL?: number;
  deduplicate?: boolean;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useOptimizedFetch<T>(
  url: string | null,
  options: UseOptimizedFetchOptions = {}
) {
  const {
    cache = true,
    cacheTTL = 5 * 60 * 1000,
    deduplicate = true,
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await optimizedFetch(url, {
        cache,
        cacheTTL,
        deduplicate,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, cache, cacheTTL, deduplicate, onSuccess, onError]);

  // 手动重新获取
  const refetch = useCallback(() => {
    if (url) {
      apiCache.delete(url);
      fetchData();
    }
  }, [url, fetchData]);

  // 初始获取
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 窗口焦点重新获取
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, fetchData]);

  // 定时重新获取
  useEffect(() => {
    if (!refetchInterval) return;

    intervalRef.current = setInterval(fetchData, refetchInterval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, fetchData]);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

// 虚拟滚动 Hook
interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useCallback(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useCallback(() => {
    const { startIndex, endIndex } = visibleRange();
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      setScrollTop(index * itemHeight);
    },
    [itemHeight]
  );

  return {
    visibleItems: visibleItems(),
    visibleRange: visibleRange(),
    totalHeight,
    handleScroll,
    scrollToIndex,
  };
}

// 图片懒加载 Hook
export function useLazyImage(
  src: string,
  options: IntersectionObserverInit = {}
) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, options]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
  }, []);

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isError,
    handleLoad,
    handleError,
  };
}

// 性能监控 Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    memoryUsage?: number;
    cacheHitRate: number;
  }>({
    renderTime: 0,
    cacheHitRate: 0,
  });

  const startTime = useRef<number>(0);

  const startMeasure = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endMeasure = useCallback((label?: string) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    setMetrics(prev => ({
      ...prev,
      renderTime,
    }));

    if (label) {
      console.log(`${label}: ${renderTime.toFixed(2)}ms`);
    }
  }, []);

  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
      }));
    }
  }, []);

  const getCacheStats = useCallback(() => {
    const stats = apiCache.getStats();
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: stats.hitRate,
    }));
  }, []);

  return {
    metrics,
    startMeasure,
    endMeasure,
    measureMemory,
    getCacheStats,
  };
}

// 批量操作 Hook
export function useBatchOperations<T>(
  batchSize: number = 10,
  delay: number = 100
) {
  const [queue, setQueue] = useState<T[]>([]);
  const [processing, setProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
  }, []);

  const processBatch = useCallback(
    async (processor: (batch: T[]) => Promise<void>) => {
      if (queue.length === 0 || processing) return;

      setProcessing(true);

      try {
        const batch = queue.slice(0, batchSize);
        setQueue(prev => prev.slice(batchSize));

        await processor(batch);

        // 如果还有更多项目，继续处理
        if (queue.length > batchSize) {
          timeoutRef.current = setTimeout(() => {
            processBatch(processor);
          }, delay);
        }
      } finally {
        setProcessing(false);
      }
    },
    [queue, processing, batchSize, delay]
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    queue,
    queueSize: queue.length,
    processing,
    addToQueue,
    processBatch,
    clearQueue,
  };
}
