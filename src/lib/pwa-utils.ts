// PWA utility functions for offline functionality

export interface OfflineEvent {
  id: string;
  teamId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  category: 'meeting' | 'task' | 'reminder';
  color: string;
  createdBy: string;
  createdAt: string;
  action: 'create' | 'update' | 'delete';
}

// IndexedDB database name and version
const DB_NAME = 'TeamCalendarDB';
const DB_VERSION = 1;
const OFFLINE_EVENTS_STORE = 'offlineEvents';

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create offline events store
      if (!db.objectStoreNames.contains(OFFLINE_EVENTS_STORE)) {
        const store = db.createObjectStore(OFFLINE_EVENTS_STORE, {
          keyPath: 'id',
        });
        store.createIndex('teamId', 'teamId', { unique: false });
        store.createIndex('action', 'action', { unique: false });
      }
    };
  });
}

// Store offline event
export async function storeOfflineEvent(event: OfflineEvent): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([OFFLINE_EVENTS_STORE], 'readwrite');
  const store = transaction.objectStore(OFFLINE_EVENTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.put(event);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get all offline events
export async function getOfflineEvents(): Promise<OfflineEvent[]> {
  const db = await initDB();
  const transaction = db.transaction([OFFLINE_EVENTS_STORE], 'readonly');
  const store = transaction.objectStore(OFFLINE_EVENTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Remove offline event
export async function removeOfflineEvent(eventId: string): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([OFFLINE_EVENTS_STORE], 'readwrite');
  const store = transaction.objectStore(OFFLINE_EVENTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.delete(eventId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Clear all offline events
export async function clearOfflineEvents(): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction([OFFLINE_EVENTS_STORE], 'readwrite');
  const store = transaction.objectStore(OFFLINE_EVENTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Check if browser supports PWA features
export function isPWASupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Check if app is installed as PWA
export function isPWAInstalled(): boolean {
  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if running in PWA mode on iOS
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  return false;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

// Show local notification
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    ...options,
  };

  return new Notification(title, defaultOptions);
}

// Cache management utilities
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

// Format cache size for display
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
