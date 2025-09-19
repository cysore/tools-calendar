'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { classifyError, StandardError } from '@/lib/error-utils';
import { errorMonitor } from '@/lib/error-monitoring';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

export interface ErrorState {
  error: ApiError | Error | null;
  isError: boolean;
  errorType: 'network' | 'permission' | 'validation' | 'server' | 'unknown';
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorType: 'unknown',
  });
  const router = useRouter();

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorType: 'unknown',
    });
  }, []);

  const handleError = useCallback(
    (error: Error | ApiError | any, context?: any) => {
      console.error('Error handled:', error);

      // 使用标准化错误分类
      const standardError = classifyError(error);

      // 记录错误到监控系统
      errorMonitor.recordError(standardError, context);

      let errorType: ErrorState['errorType'] = 'unknown';
      let processedError: ApiError | Error;

      // 映射标准错误类型到本地错误类型
      switch (standardError.type) {
        case 'network':
        case 'timeout':
          errorType = 'network';
          processedError = new Error(standardError.userMessage);
          break;
        case 'authentication':
          errorType = 'permission';
          processedError = new Error(standardError.userMessage);
          // 自动跳转到登录页
          setTimeout(() => router.push('/auth/login'), 2000);
          break;
        case 'authorization':
          errorType = 'permission';
          processedError = new Error(standardError.userMessage);
          break;
        case 'not_found':
          errorType = 'unknown';
          processedError = new Error(standardError.userMessage);
          break;
        case 'server':
          errorType = 'server';
          processedError = new Error(standardError.userMessage);
          break;
        case 'validation':
          errorType = 'validation';
          processedError = error;
          break;
        default:
          errorType = 'unknown';
          processedError = new Error(standardError.userMessage);
      }

      setErrorState({
        error: processedError,
        isError: true,
        errorType,
      });
    },
    [router]
  );

  const handleApiError = useCallback(
    async (response: Response) => {
      let errorData: any;

      try {
        errorData = await response.json();
      } catch {
        errorData = { message: '服务器响应格式错误' };
      }

      const apiError: ApiError = {
        code: errorData.error?.code || 'UNKNOWN_ERROR',
        message: errorData.error?.message || errorData.message || '请求失败',
        details: errorData.error?.details || errorData.details,
        status: response.status,
      };

      handleError(apiError);
      return apiError;
    },
    [handleError]
  );

  const withErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | null> => {
        try {
          clearError();
          return await fn(...args);
        } catch (error) {
          handleError(error);
          return null;
        }
      };
    },
    [handleError, clearError]
  );

  return {
    ...errorState,
    handleError,
    handleApiError,
    clearError,
    withErrorHandling,
  };
}

// 全局错误处理器
export function useGlobalErrorHandler() {
  const { handleError } = useErrorHandler();

  // 处理未捕获的 Promise 拒绝
  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      handleError(event.reason);
    },
    [handleError]
  );

  // 处理全局错误
  const handleGlobalError = useCallback(
    (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      handleError(event.error);
    },
    [handleError]
  );

  return {
    handleUnhandledRejection,
    handleGlobalError,
  };
}
