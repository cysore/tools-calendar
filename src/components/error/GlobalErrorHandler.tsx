'use client';

import { useEffect } from 'react';
import { useGlobalErrorHandler } from '@/hooks/useErrorHandler';

export function GlobalErrorHandler() {
  const { handleUnhandledRejection, handleGlobalError } =
    useGlobalErrorHandler();

  useEffect(() => {
    // 处理未捕获的 Promise 拒绝
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // 处理全局 JavaScript 错误
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      window.removeEventListener('error', handleGlobalError);
    };
  }, [handleUnhandledRejection, handleGlobalError]);

  return null;
}
