'use client';

import { useEffect } from 'react';
import { registerServiceWorker, initDB } from '@/lib/pwa-utils';

export function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features when component mounts
    const initializePWA = async () => {
      try {
        // Register service worker
        await registerServiceWorker();

        // Initialize IndexedDB for offline storage
        await initDB();

        console.log('PWA initialized successfully');
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    initializePWA();
  }, []);

  // This component doesn't render anything
  return null;
}
