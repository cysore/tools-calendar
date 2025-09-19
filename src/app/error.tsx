'use client';

import { useEffect } from 'react';
import { GenericErrorPage } from '@/components/error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到监控服务
    console.error('Application error:', error);
  }, [error]);

  return <GenericErrorPage error={error} onRetry={reset} />;
}
