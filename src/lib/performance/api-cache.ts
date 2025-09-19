'use client';

// 缓存条目接口
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
}

// API 缓存管理器
class ApiCacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // 最大缓存条目数
  private defaultTTL = 5 * 60 * 1000; // 默认 5 分钟 TTL

  // 生成缓存键
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  // 检查缓存是否有效
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // 清理过期缓存
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    for (const [key, entry] of entries) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }

    // 如果缓存仍然太大，删除最旧的条目
    if (this.cache.size > this.maxSize) {
      const remainingEntries = Array.from(this.cache.entries());
      remainingEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = remainingEntries.slice(
        0,
        remainingEntries.length - this.maxSize
      );
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // 获取缓存数据
  get(url: string, params?: Record<string, any>): any | null {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);

    if (entry && this.isValid(entry)) {
      return entry.data;
    }

    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  // 设置缓存数据
  set(
    url: string,
    data: any,
    params?: Record<string, any>,
    ttl: number = this.defaultTTL,
    etag?: string
  ): void {
    const key = this.generateKey(url, params);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      etag,
    });

    this.cleanup();
  }

  // 删除特定缓存
  delete(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
  }

  // 清空所有缓存
  clear(): void {
    this.cache.clear();
  }

  // 使缓存失效（通过模式匹配）
  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 获取缓存统计信息
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // 需要实现命中率统计
    };
  }
}

// 全局缓存实例
export const apiCache = new ApiCacheManager();

// 请求去重管理器
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  // 去重请求
  deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // 取消请求
  cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  // 清空所有请求
  clear(): void {
    this.pendingRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// 优化的 fetch 函数
interface OptimizedFetchOptions extends Omit<RequestInit, 'cache'> {
  cache?: boolean;
  cacheTTL?: number;
  deduplicate?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function optimizedFetch(
  url: string,
  options: OptimizedFetchOptions = {}
): Promise<Response> {
  const {
    cache = true,
    cacheTTL = 5 * 60 * 1000,
    deduplicate = true,
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  // 生成请求键
  const requestKey = `${url}:${JSON.stringify(fetchOptions)}`;

  // 检查缓存
  if (
    cache &&
    fetchOptions.method !== 'POST' &&
    fetchOptions.method !== 'PUT' &&
    fetchOptions.method !== 'DELETE'
  ) {
    const cachedData = apiCache.get(
      url,
      fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined
    );
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 请求函数
  const makeRequest = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 缓存成功的 GET 请求
      if (
        cache &&
        response.ok &&
        (!fetchOptions.method || fetchOptions.method === 'GET')
      ) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        apiCache.set(
          url,
          data,
          fetchOptions.body
            ? JSON.parse(fetchOptions.body as string)
            : undefined,
          cacheTTL
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // 重试逻辑
  const makeRequestWithRetry = async (
    attempt: number = 1
  ): Promise<Response> => {
    try {
      return await makeRequest();
    } catch (error) {
      if (
        attempt < retries &&
        error instanceof Error &&
        error.name !== 'AbortError'
      ) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return makeRequestWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  // 请求去重
  if (deduplicate && (!fetchOptions.method || fetchOptions.method === 'GET')) {
    return requestDeduplicator.deduplicate(requestKey, makeRequestWithRetry);
  }

  return makeRequestWithRetry();
}

// 批量请求接口
interface BatchRequest {
  requests: Array<{
    url: string;
    options: RequestInit;
    resolve: (response: Response) => void;
    reject: (error: Error) => void;
  }>;
  timeout: NodeJS.Timeout;
}

// 批量请求管理器
class BatchRequestManager {
  private batches = new Map<string, BatchRequest>();
  private batchDelay = 50; // 50ms 批处理延迟

  // 添加到批处理
  add(url: string, options: RequestInit = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(url);

      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, {
          requests: [],
          timeout: setTimeout(
            () => this.executeBatch(batchKey),
            this.batchDelay
          ),
        });
      }

      const batch = this.batches.get(batchKey)!;
      batch.requests.push({ url, options, resolve, reject });
    });
  }

  // 获取批处理键
  private getBatchKey(url: string): string {
    // 简单的批处理键生成，可以根据需要优化
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname;
  }

  // 执行批处理
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    // 并行执行所有请求
    const promises = batch.requests.map(
      async ({ url, options, resolve, reject }) => {
        try {
          const { cache: _, ...fetchOptions } = options as any;
          const response = await optimizedFetch(url, fetchOptions);
          resolve(response);
        } catch (error) {
          reject(error as Error);
        }
      }
    );

    await Promise.allSettled(promises);
  }
}

export const batchRequestManager = new BatchRequestManager();

// 预取管理器
class PrefetchManager {
  private prefetchedUrls = new Set<string>();

  // 预取资源
  prefetch(url: string, options: RequestInit = {}): void {
    if (this.prefetchedUrls.has(url)) return;

    this.prefetchedUrls.add(url);

    // 在空闲时间预取
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        optimizedFetch(url, { ...options, cache: true });
      });
    } else {
      setTimeout(() => {
        optimizedFetch(url, { ...options, cache: true });
      }, 100);
    }
  }

  // 预取多个资源
  prefetchMultiple(urls: string[], options: RequestInit = {}): void {
    urls.forEach(url => this.prefetch(url, options));
  }

  // 清空预取记录
  clear(): void {
    this.prefetchedUrls.clear();
  }
}

export const prefetchManager = new PrefetchManager();

// 缓存失效策略
export const cacheInvalidation = {
  // 事件相关缓存失效
  invalidateEvents: (teamId?: string) => {
    if (teamId) {
      apiCache.invalidate(`/api/teams/${teamId}/events`);
    } else {
      apiCache.invalidate('/api/teams/');
      apiCache.invalidate('/events');
    }
  },

  // 团队相关缓存失效
  invalidateTeams: (teamId?: string) => {
    if (teamId) {
      apiCache.invalidate(`/api/teams/${teamId}`);
    } else {
      apiCache.invalidate('/api/teams');
    }
  },

  // 用户相关缓存失效
  invalidateUser: () => {
    apiCache.invalidate('/api/auth');
    apiCache.invalidate('/api/user');
  },

  // 全部缓存失效
  invalidateAll: () => {
    apiCache.clear();
  },
};
