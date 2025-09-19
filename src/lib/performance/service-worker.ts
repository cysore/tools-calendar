// Service Worker for performance optimization
// This file should be copied to public/sw.js during build

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'team-calendar-sync-v1';
const STATIC_CACHE_NAME = 'static-v1';
const API_CACHE_NAME = 'api-v1';

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/auth/login',
  '/manifest.json',
  // 添加其他静态资源
];

// API 缓存配置
const API_CACHE_CONFIG = {
  // GET 请求缓存时间（毫秒）
  cacheDuration: {
    '/api/teams': 5 * 60 * 1000, // 5分钟
    '/api/teams/*/events': 2 * 60 * 1000, // 2分钟
    '/api/auth/me': 10 * 60 * 1000, // 10分钟
  },
  // 不缓存的 API 路径
  noCachePatterns: [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/register',
  ],
};

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // 跳过等待，立即激活
      self.skipWaiting(),
    ])
  );
});

// 激活事件
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            ) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim(),
    ])
  );
});

// 获取事件
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) {
    return;
  }

  // API 请求处理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静态资源处理
  event.respondWith(handleStaticRequest(request));
});

// 处理 API 请求
async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 检查是否不应该缓存
  const shouldNotCache = API_CACHE_CONFIG.noCachePatterns.some(pattern =>
    pathname.includes(pattern)
  );

  if (shouldNotCache || request.method !== 'GET') {
    // 直接发送请求，不缓存
    try {
      return await fetch(request);
    } catch (error) {
      // 网络错误时返回离线页面或错误响应
      return new Response(
        JSON.stringify({ error: 'Network error', offline: true }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 尝试从缓存获取
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // 检查缓存是否有效
  if (cachedResponse) {
    const cacheTime = cachedResponse.headers.get('sw-cache-time');
    if (cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      const maxAge = getCacheDuration(pathname);

      if (age < maxAge) {
        // 缓存仍然有效，返回缓存的响应
        return cachedResponse;
      }
    }
  }

  // 发送网络请求
  try {
    const networkResponse = await fetch(request);

    // 只缓存成功的响应
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();

      // 添加缓存时间戳
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      });

      cache.put(request, modifiedResponse);
    }

    return networkResponse;
  } catch (error) {
    // 网络错误时返回缓存的响应（如果有）
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ error: 'Network error', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// 处理静态资源请求
async function handleStaticRequest(request: Request): Promise<Response> {
  // 缓存优先策略
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // 网络请求
  try {
    const networkResponse = await fetch(request);

    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // 返回离线页面或默认响应
    return new Response('Offline', { status: 503 });
  }
}

// 获取缓存持续时间
function getCacheDuration(pathname: string): number {
  for (const [pattern, duration] of Object.entries(
    API_CACHE_CONFIG.cacheDuration
  )) {
    if (pathname.includes(pattern.replace('*', ''))) {
      return duration;
    }
  }
  return 5 * 60 * 1000; // 默认 5 分钟
}

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(API_CACHE_NAME),
        caches.delete(STATIC_CACHE_NAME),
      ])
    );
  }
});

// 后台同步
self.addEventListener('sync', event => {
  if ((event as any).tag === 'background-sync') {
    (event as any).waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  // 这里可以实现离线时的数据同步逻辑
  console.log('Background sync triggered');
}

// 推送通知
self.addEventListener('push', event => {
  const pushEvent = event as any;
  if (pushEvent.data) {
    const data = pushEvent.data.json();

    pushEvent.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        data: data.data,
      })
    );
  }
});

// 通知点击
self.addEventListener('notificationclick', event => {
  const notificationEvent = event as any;
  notificationEvent.notification.close();

  notificationEvent.waitUntil(
    self.clients.openWindow(notificationEvent.notification.data?.url || '/')
  );
});

export {};
