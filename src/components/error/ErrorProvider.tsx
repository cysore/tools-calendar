'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFeedback } from './ErrorFeedback';
import { useToast } from '@/components/ui/toast';
import {
  classifyError,
  StandardError,
  errorReporter,
  errorRecoveryManager,
} from '@/lib/error-utils';

interface ErrorContextType {
  showErrorFeedback: (error: Error) => void;
  reportError: (error: Error, context?: any) => void;
  clearErrors: () => void;
  retryLastAction: () => void;
  isRecovering: boolean;
  lastError: StandardError | null;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorProviderProps {
  children: React.ReactNode;
  onError?: (error: StandardError) => void;
  enableAutoRecovery?: boolean;
  enableErrorReporting?: boolean;
}

export function ErrorProvider({
  children,
  onError,
  enableAutoRecovery = true,
  enableErrorReporting = true,
}: ErrorProviderProps) {
  const [feedbackError, setFeedbackError] = useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastError, setLastError] = useState<StandardError | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const { error: showToastError, success } = useToast();

  // 启动错误报告器的定期报告
  useEffect(() => {
    if (enableErrorReporting) {
      errorReporter.startPeriodicReporting();
    }
  }, [enableErrorReporting]);

  const reportError = useCallback(
    async (error: Error, context?: any) => {
      const standardError = classifyError(error);
      setLastError(standardError);

      // 报告错误
      if (enableErrorReporting) {
        await errorReporter.reportError(standardError);
      }

      // 调用外部错误处理器
      if (onError) {
        onError(standardError);
      }

      // 尝试自动恢复
      if (enableAutoRecovery && standardError.recoverable) {
        setIsRecovering(true);

        try {
          const recovered =
            await errorRecoveryManager.attemptRecovery(standardError);

          if (recovered) {
            success('问题已自动修复');
            setLastError(null);
          } else {
            // 显示用户友好的错误提示
            showToastError(
              standardError.userMessage,
              standardError.retryable ? '您可以尝试重试操作' : undefined,
              standardError.retryable && lastAction
                ? {
                    label: '重试',
                    onClick: () => retryLastAction(),
                  }
                : undefined
            );
          }
        } catch (recoveryError) {
          console.error('Error recovery failed:', recoveryError);
          showToastError(standardError.userMessage);
        } finally {
          setIsRecovering(false);
        }
      } else {
        // 直接显示错误提示
        showToastError(standardError.userMessage);
      }
    },
    [
      enableErrorReporting,
      enableAutoRecovery,
      onError,
      showToastError,
      success,
      lastAction,
    ]
  );

  const showErrorFeedback = useCallback((error: Error) => {
    setFeedbackError(error);
  }, []);

  const clearErrors = useCallback(() => {
    setLastError(null);
    setFeedbackError(null);
    setLastAction(null);
  }, []);

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      try {
        lastAction();
        setLastError(null);
      } catch (error) {
        if (error instanceof Error) {
          reportError(error);
        }
      }
    }
  }, [lastAction, reportError]);

  // 注册最后执行的操作（用于重试）
  const registerAction = useCallback((action: () => void) => {
    setLastAction(() => action);
  }, []);

  const contextValue: ErrorContextType = {
    showErrorFeedback,
    reportError,
    clearErrors,
    retryLastAction,
    isRecovering,
    lastError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          reportError(error, { errorInfo });
        }}
      >
        {children}

        {/* 错误反馈模态框 */}
        {feedbackError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <ErrorFeedback
              error={feedbackError}
              onClose={() => setFeedbackError(null)}
              onSubmit={async feedback => {
                // 提交反馈到服务器
                await fetch('/api/error-feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(feedback),
                });
              }}
            />
          </div>
        )}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
}

// 高阶组件，用于包装需要错误处理的组件
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enableAutoRecovery?: boolean;
    enableErrorReporting?: boolean;
    onError?: (error: StandardError) => void;
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorProvider {...options}>
      <Component {...props} />
    </ErrorProvider>
  );

  WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for registering actions that can be retried
export function useRetryableAction() {
  const { reportError } = useErrorContext();

  return useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await fn(...args);
        } catch (error) {
          if (error instanceof Error) {
            reportError(error);
          }
          return null;
        }
      };
    },
    [reportError]
  );
}
