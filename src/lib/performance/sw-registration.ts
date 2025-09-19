'use client';

// Service Worker 注册和管理

interface SwRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private options: SwRegistrationOptions;

  constructor(options: SwRegistrationOptions = {}) {
    this.options = options;
  }

  // 注册 Service Worker
  async register(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully');
      this.options.onSuccess?.(this.registration);

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // 有新版本可用
              this.options.onUpdate?.(this.registration!);
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.options.onError?.(error as Error);
    }
  }

  // 更新 Service Worker
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }

  // 跳过等待，立即激活新版本
  skipWaiting(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // 清除缓存
  clearCache(): void {
    if (this.registration?.active) {
      this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }

  // 注销 Service Worker
  async unregister(): Promise<boolean> {
    if (this.registration) {
      return await this.registration.unregister();
    }
    return false;
  }

  // 获取注册状态
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // 检查是否有更新
  async checkForUpdates(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }
}

// 全局 Service Worker 管理器实例
export const swManager = new ServiceWorkerManager({
  onUpdate: registration => {
    // 显示更新提示
    showUpdateNotification();
  },
  onSuccess: registration => {
    console.log('Service Worker ready');
  },
  onError: error => {
    console.error('Service Worker error:', error);
  },
});

// 显示更新通知
function showUpdateNotification(): void {
  // 创建更新提示 UI
  const notification = document.createElement('div');
  notification.className =
    'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium">新版本可用</h4>
        <p class="text-sm opacity-90 mt-1">点击刷新以获取最新功能</p>
      </div>
      <button id="update-btn" class="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">
        刷新
      </button>
    </div>
    <button id="dismiss-btn" class="absolute top-2 right-2 text-white opacity-70 hover:opacity-100">
      ✕
    </button>
  `;

  document.body.appendChild(notification);

  // 处理按钮点击
  const updateBtn = notification.querySelector('#update-btn');
  const dismissBtn = notification.querySelector('#dismiss-btn');

  updateBtn?.addEventListener('click', () => {
    swManager.skipWaiting();
    window.location.reload();
  });

  dismissBtn?.addEventListener('click', () => {
    document.body.removeChild(notification);
  });

  // 10秒后自动消失
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 10000);
}

// 初始化 Service Worker
export function initServiceWorker(): void {
  if (typeof window !== 'undefined') {
    // 页面加载完成后注册
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        swManager.register();
      });
    } else {
      swManager.register();
    }

    // 定期检查更新（每30分钟）
    setInterval(
      () => {
        swManager.checkForUpdates();
      },
      30 * 60 * 1000
    );

    // 页面可见性变化时检查更新
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        swManager.checkForUpdates();
      }
    });
  }
}

// 预缓存关键资源
export function precacheResources(urls: string[]): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PRECACHE_RESOURCES',
      urls,
    });
  }
}

// 清除所有缓存
export function clearAllCaches(): Promise<void> {
  return new Promise(resolve => {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(cacheNames.map(cacheName => caches.delete(cacheName))).then(
          () => {
            swManager.clearCache();
            resolve();
          }
        );
      });
    } else {
      resolve();
    }
  });
}

// 获取缓存使用情况
export async function getCacheUsage(): Promise<{
  quota: number;
  usage: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return { quota, usage, percentage };
  }

  return { quota: 0, usage: 0, percentage: 0 };
}
