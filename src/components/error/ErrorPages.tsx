'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  Lock,
  FileX,
  Server,
  RefreshCw,
  Home,
  ArrowLeft,
} from 'lucide-react';

interface ErrorPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  details?: string;
}

function ErrorPageLayout({
  title,
  description,
  icon,
  actions,
  details,
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {details && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-600">{details}</p>
            </div>
          )}
          {actions}
        </CardContent>
      </Card>
    </div>
  );
}

// 网络错误页面
export function NetworkErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorPageLayout
      title="网络连接失败"
      description="无法连接到服务器，请检查您的网络连接。"
      icon={<WifiOff className="h-6 w-6 text-red-600" />}
      details="请确保您的设备已连接到互联网，然后重试。"
      actions={
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试连接
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      }
    />
  );
}

// 权限错误页面
export function PermissionErrorPage({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <ErrorPageLayout
      title="访问被拒绝"
      description="您没有权限访问此页面或执行此操作。"
      icon={<Lock className="h-6 w-6 text-red-600" />}
      details="请联系团队管理员获取相应权限，或使用有权限的账户登录。"
      actions={
        <div className="flex flex-col gap-2">
          <Button
            onClick={onGoBack || (() => window.history.back())}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一页
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/auth/login')}
            className="w-full"
          >
            重新登录
          </Button>
        </div>
      }
    />
  );
}

// 404 页面
export function NotFoundPage() {
  return (
    <ErrorPageLayout
      title="页面未找到"
      description="您访问的页面不存在或已被移动。"
      icon={<FileX className="h-6 w-6 text-red-600" />}
      details="请检查网址是否正确，或从导航菜单重新访问。"
      actions={
        <div className="flex flex-col gap-2">
          <Button onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一页
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      }
    />
  );
}

// 服务器错误页面
export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorPageLayout
      title="服务器错误"
      description="服务器遇到了问题，无法完成您的请求。"
      icon={<Server className="h-6 w-6 text-red-600" />}
      details="我们已经收到错误报告，正在努力修复。请稍后重试。"
      actions={
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      }
    />
  );
}

// 离线页面
export function OfflinePage() {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <ErrorPageLayout
      title="您当前处于离线状态"
      description="无法连接到互联网，某些功能可能不可用。"
      icon={<WifiOff className="h-6 w-6 text-orange-600" />}
      details="您可以继续查看已缓存的内容，或等待网络连接恢复。"
      actions={
        <div className="flex flex-col gap-2">
          <Button onClick={handleRetry} className="w-full">
            <Wifi className="mr-2 h-4 w-4" />
            检查连接
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/offline')}
            className="w-full"
          >
            查看离线内容
          </Button>
        </div>
      }
    />
  );
}

// 通用错误页面
export function GenericErrorPage({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry?: () => void;
}) {
  return (
    <ErrorPageLayout
      title="出现了问题"
      description="应用遇到了意外错误，请重试或联系支持。"
      icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
      details={error?.message || '未知错误'}
      actions={
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      }
    />
  );
}
