'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ErrorRecoveryProps {
  error: Error;
  onRetry: () => void;
  onReset?: () => void;
  showNetworkStatus?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

export function ErrorRecovery({
  error,
  onRetry,
  onReset,
  showNetworkStatus = true,
  autoRetry = false,
  maxRetries = 3,
}: ErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { info, error: showError } = useToast();

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      info('网络连接已恢复');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showError('网络连接已断开');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [info, showError]);

  // 自动重试逻辑
  useEffect(() => {
    if (autoRetry && retryCount < maxRetries && isOnline) {
      const timer = setTimeout(
        () => {
          handleRetry();
        },
        Math.pow(2, retryCount) * 1000
      ); // 指数退避

      return () => clearTimeout(timer);
    }
  }, [autoRetry, retryCount, maxRetries, isOnline]);

  const handleRetry = async () => {
    if (!isOnline) {
      showError('请检查网络连接后重试');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReset = () => {
    setRetryCount(0);
    if (onReset) {
      onReset();
    }
  };

  const getErrorType = (error: Error) => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'auth';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'permission';
    }
    return 'unknown';
  };

  const getRecoveryMessage = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return '网络连接出现问题，请检查您的网络设置。';
      case 'timeout':
        return '请求超时，可能是网络较慢或服务器繁忙。';
      case 'auth':
        return '登录状态已过期，请重新登录。';
      case 'permission':
        return '您没有权限执行此操作，请联系管理员。';
      default:
        return '遇到了意外错误，请稍后重试。';
    }
  };

  const errorType = getErrorType(error);
  const recoveryMessage = getRecoveryMessage(errorType);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg">操作失败</CardTitle>
        <CardDescription>{recoveryMessage}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 网络状态指示器 */}
        {showNetworkStatus && (
          <div className="flex items-center justify-center space-x-2 text-sm">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-green-600">网络连接正常</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-red-600">网络连接断开</span>
              </>
            )}
          </div>
        )}

        {/* 错误详情（开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-md bg-gray-50 p-3">
            <h4 className="text-sm font-medium text-gray-800 mb-1">
              错误详情：
            </h4>
            <p className="text-xs text-gray-600 break-all">{error.message}</p>
          </div>
        )}

        {/* 重试信息 */}
        {retryCount > 0 && (
          <div className="text-center text-sm text-gray-600">
            已重试 {retryCount} 次
            {autoRetry && retryCount < maxRetries && (
              <span className="block mt-1">
                将在 {Math.pow(2, retryCount)} 秒后自动重试
              </span>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || !isOnline}
            className="w-full"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                重试中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </>
            )}
          </Button>

          {errorType === 'auth' && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/auth/login')}
              className="w-full"
            >
              重新登录
            </Button>
          )}

          {onReset && retryCount > 0 && (
            <Button variant="ghost" onClick={handleReset} className="w-full">
              重置
            </Button>
          )}
        </div>

        {/* 自动重试控制 */}
        {autoRetry && retryCount >= maxRetries && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">已达到最大重试次数</p>
            <Button variant="outline" onClick={handleReset} size="sm">
              手动重试
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 简化版错误恢复组件
export function SimpleErrorRecovery({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-4">
      <p className="text-red-600 mb-4">{error.message}</p>
      <Button onClick={onRetry} size="sm">
        <RefreshCw className="mr-2 h-4 w-4" />
        重试
      </Button>
    </div>
  );
}
