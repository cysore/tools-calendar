'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff } from 'lucide-react';

interface OfflineDetectorProps {
  children?: React.ReactNode;
}

export function OfflineDetector({ children }: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);

      // Trigger background sync when coming back online
      if (
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype
      ) {
        navigator.serviceWorker.ready
          .then(registration => {
            // Type assertion for sync API which may not be in all browsers
            const syncRegistration = registration as any;
            if (syncRegistration.sync) {
              return syncRegistration.sync.register('sync-events');
            }
          })
          .catch(error => {
            console.error('Background sync registration failed:', error);
          });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-hide offline alert after 5 seconds when back online
  useEffect(() => {
    if (isOnline && showOfflineAlert) {
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineAlert]);

  return (
    <>
      {/* Offline Status Alert */}
      {!isOnline && (
        <Alert className="fixed top-4 left-4 right-4 z-50 bg-orange-50 border-orange-200">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            您当前处于离线状态。某些功能可能不可用，数据将在重新连接时同步。
          </AlertDescription>
        </Alert>
      )}

      {/* Back Online Alert */}
      {isOnline && showOfflineAlert && (
        <Alert className="fixed top-4 left-4 right-4 z-50 bg-green-50 border-green-200">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            网络连接已恢复！正在同步离线数据...
          </AlertDescription>
        </Alert>
      )}

      {children}
    </>
  );
}

// Hook for checking online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
