// Custom Service Worker for Team Calendar Sync
const CACHE_NAME = 'team-calendar-v1';
const OFFLINE_URL = '/offline';

// Assets to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/auth/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.svg',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/teams$/,
  /^\/api\/teams\/[^\/]+$/,
  /^\/api\/teams\/[^\/]+\/events$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached page or offline page
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page for navigation requests
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Check if this API endpoint should be cached
    const shouldCache = API_CACHE_PATTERNS.some(pattern => 
      pattern.test(url.pathname)
    );

    if (shouldCache) {
      event.respondWith(
        // Network first strategy for API calls
        fetch(request)
          .then((response) => {
            // Cache successful API responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Return cached API response if available
            return caches.match(request);
          })
      );
    }
    return;
  }

  // Handle static assets (images, fonts, etc.)
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      request.destination === 'style' || 
      request.destination === 'script') {
    
    event.respondWith(
      // Cache first strategy for static assets
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              // Cache the asset
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-events') {
    event.waitUntil(syncOfflineEvents());
  }
});

// Sync offline events when connection is restored
async function syncOfflineEvents() {
  try {
    // Get offline events from IndexedDB or localStorage
    const offlineEvents = await getOfflineEvents();
    
    for (const event of offlineEvents) {
      try {
        await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });
        
        // Remove from offline storage after successful sync
        await removeOfflineEvent(event.id);
      } catch (error) {
        console.error('Failed to sync event:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline storage
async function getOfflineEvents() {
  // Implementation would use IndexedDB or localStorage
  return [];
}

async function removeOfflineEvent(eventId) {
  // Implementation would remove from IndexedDB or localStorage
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New calendar event',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard',
    },
  };

  event.waitUntil(
    self.registration.showNotification('团队日历', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});