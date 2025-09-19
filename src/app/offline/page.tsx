'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">您当前处于离线状态</CardTitle>
          <CardDescription>
            无法连接到网络。请检查您的网络连接并重试。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>在离线模式下，您可以：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>查看已缓存的日历数据</li>
              <li>浏览之前访问过的页面</li>
              <li>查看团队信息</li>
            </ul>
            <p className="mt-3">当网络连接恢复时，应用将自动同步您的数据。</p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              重新连接
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            <p>团队日历同步器 - PWA 离线模式</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
