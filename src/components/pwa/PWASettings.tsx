'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Bell,
  Download,
  Trash2,
  Wifi,
  WifiOff,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import {
  isPWASupported,
  isPWAInstalled,
  requestNotificationPermission,
  getCacheSize,
  clearAllCaches,
  formatCacheSize,
} from '@/lib/pwa-utils';
import { useOnlineStatus } from './OfflineDetector';

export function PWASettings() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');
  const [cacheSize, setCacheSize] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Check PWA installation status
    setIsInstalled(isPWAInstalled());

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Get cache size
    getCacheSize().then(setCacheSize).catch(console.error);
  }, []);

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllCaches();
      setCacheSize(0);
      // Reload the page to refresh the cache
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const refreshCacheSize = async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to get cache size:', error);
    }
  };

  if (!isPWASupported()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>PWA 功能</span>
          </CardTitle>
          <CardDescription>您的浏览器不支持 PWA 功能</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Installation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>应用安装</span>
          </CardTitle>
          <CardDescription>
            将应用安装到设备主屏幕以获得更好的体验
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">安装状态:</span>
              <Badge variant={isInstalled ? 'default' : 'secondary'}>
                {isInstalled ? '已安装' : '未安装'}
              </Badge>
            </div>
            {!isInstalled && (
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                安装应用
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-orange-600" />
            )}
            <span>网络状态</span>
          </CardTitle>
          <CardDescription>当前网络连接状态和离线功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">连接状态:</span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? '在线' : '离线'}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {isOnline ? (
                <p>您当前已连接到网络，所有功能正常可用。</p>
              ) : (
                <p>
                  您当前处于离线状态，可以查看缓存的数据。网络恢复后将自动同步。
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>通知设置</span>
          </CardTitle>
          <CardDescription>管理应用通知权限和设置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">通知权限:</span>
              <Badge
                variant={
                  notificationPermission === 'granted'
                    ? 'default'
                    : notificationPermission === 'denied'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {notificationPermission === 'granted' && '已授权'}
                {notificationPermission === 'denied' && '已拒绝'}
                {notificationPermission === 'default' && '未设置'}
              </Badge>
            </div>

            {notificationPermission !== 'granted' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestNotifications}
                disabled={notificationPermission === 'denied'}
              >
                <Bell className="mr-2 h-4 w-4" />
                {notificationPermission === 'denied'
                  ? '权限已拒绝'
                  : '请求通知权限'}
              </Button>
            )}

            <div className="text-sm text-muted-foreground">
              <p>启用通知后，您将收到重要的日历事件提醒和团队更新。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>缓存管理</span>
          </CardTitle>
          <CardDescription>管理应用缓存和离线数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">缓存大小:</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{formatCacheSize(cacheSize)}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refreshCacheSize}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearCache}
                disabled={isClearing || cacheSize === 0}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isClearing ? '清理中...' : '清理缓存'}
              </Button>

              <div className="text-xs text-muted-foreground">
                <p>
                  清理缓存将删除所有离线数据，下次访问时需要重新下载。
                  这可能会影响离线功能的使用。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
