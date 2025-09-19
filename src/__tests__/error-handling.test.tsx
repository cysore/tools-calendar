import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorRecovery } from '@/components/error/ErrorRecovery';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { classifyError, ErrorType, ErrorSeverity } from '@/lib/error-utils';
import { ToastProvider } from '@/components/ui/toast';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock 组件用于测试错误边界
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// 测试用的包装组件
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // 抑制控制台错误输出
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
    expect(
      screen.getByText('应用遇到了意外错误，我们已经记录了这个问题。')
    ).toBeInTheDocument();
  });

  it('should show retry button and handle retry', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeInTheDocument();

    // 验证重试按钮可以点击
    fireEvent.click(retryButton);

    // 点击后错误边界应该重置状态
    // 由于组件仍然会抛出错误，所以会再次显示错误UI
    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});

describe('ErrorRecovery', () => {
  const mockError = new Error('Test error');
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should render error recovery UI', () => {
    render(
      <TestWrapper>
        <ErrorRecovery error={mockError} onRetry={mockOnRetry} />
      </TestWrapper>
    );

    expect(screen.getByText('操作失败')).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    render(
      <TestWrapper>
        <ErrorRecovery error={mockError} onRetry={mockOnRetry} />
      </TestWrapper>
    );

    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('should show network status', () => {
    render(
      <TestWrapper>
        <ErrorRecovery
          error={mockError}
          onRetry={mockOnRetry}
          showNetworkStatus={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('网络连接正常')).toBeInTheDocument();
  });

  it('should disable retry when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <TestWrapper>
        <ErrorRecovery
          error={mockError}
          onRetry={mockOnRetry}
          showNetworkStatus={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('网络连接断开')).toBeInTheDocument();

    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeDisabled();
  });
});

describe('useErrorHandler', () => {
  function TestComponent() {
    const { error, isError, handleError, clearError } = useErrorHandler();

    return (
      <div>
        {isError && <div data-testid="error">{error?.message}</div>}
        <button onClick={() => handleError(new Error('Test error'))}>
          Trigger Error
        </button>
        <button onClick={clearError}>Clear Error</button>
      </div>
    );
  }

  it('should handle and clear errors', () => {
    render(<TestComponent />);

    // 触发错误
    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByTestId('error')).toHaveTextContent(
      '发生了意外错误，请重试'
    );

    // 清除错误
    fireEvent.click(screen.getByText('Clear Error'));
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  it('should wrap functions with error handling', () => {
    function TestComponentWithWrapper() {
      const { error, isError, withErrorHandling } = useErrorHandler();

      const riskyFunction = withErrorHandling(async () => {
        throw new Error('Async error');
      });

      return (
        <div>
          {isError && <div data-testid="error">{error?.message}</div>}
          <button onClick={riskyFunction}>Call Risky Function</button>
        </div>
      );
    }

    render(<TestComponentWithWrapper />);

    fireEvent.click(screen.getByText('Call Risky Function'));

    waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Async error');
    });
  });
});

describe('classifyError', () => {
  it('should classify network errors correctly', () => {
    const networkError = new TypeError('Failed to fetch');
    const classified = classifyError(networkError);

    expect(classified.type).toBe(ErrorType.NETWORK);
    expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
    expect(classified.retryable).toBe(true);
    expect(classified.recoverable).toBe(true);
  });

  it('should classify authentication errors correctly', () => {
    const authError = { status: 401, message: 'Unauthorized' };
    const classified = classifyError(authError);

    expect(classified.type).toBe(ErrorType.AUTHENTICATION);
    expect(classified.severity).toBe(ErrorSeverity.HIGH);
    expect(classified.retryable).toBe(false);
    expect(classified.recoverable).toBe(true);
  });

  it('should classify validation errors correctly', () => {
    const validationError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: { field: 'email' },
    };
    const classified = classifyError(validationError);

    expect(classified.type).toBe(ErrorType.VALIDATION);
    expect(classified.severity).toBe(ErrorSeverity.LOW);
    expect(classified.retryable).toBe(false);
    expect(classified.recoverable).toBe(true);
    expect(classified.details).toEqual({ field: 'email' });
  });

  it('should classify server errors correctly', () => {
    const serverError = { status: 500, message: 'Internal Server Error' };
    const classified = classifyError(serverError);

    expect(classified.type).toBe(ErrorType.SERVER);
    expect(classified.severity).toBe(ErrorSeverity.HIGH);
    expect(classified.retryable).toBe(true);
    expect(classified.recoverable).toBe(true);
  });

  it('should classify unknown errors correctly', () => {
    const unknownError = new Error('Something went wrong');
    const classified = classifyError(unknownError);

    expect(classified.type).toBe(ErrorType.UNKNOWN);
    expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
    expect(classified.retryable).toBe(true);
    expect(classified.recoverable).toBe(true);
  });
});

describe('Error Pages', () => {
  it('should render network error page', async () => {
    const { NetworkErrorPage } = await import('@/components/error/ErrorPages');

    render(<NetworkErrorPage />);

    expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    expect(
      screen.getByText('无法连接到服务器，请检查您的网络连接。')
    ).toBeInTheDocument();
  });

  it('should render permission error page', async () => {
    const { PermissionErrorPage } = await import(
      '@/components/error/ErrorPages'
    );

    render(<PermissionErrorPage />);

    expect(screen.getByText('访问被拒绝')).toBeInTheDocument();
    expect(
      screen.getByText('您没有权限访问此页面或执行此操作。')
    ).toBeInTheDocument();
  });

  it('should render not found page', async () => {
    const { NotFoundPage } = await import('@/components/error/ErrorPages');

    render(<NotFoundPage />);

    expect(screen.getByText('页面未找到')).toBeInTheDocument();
    expect(
      screen.getByText('您访问的页面不存在或已被移动。')
    ).toBeInTheDocument();
  });
});
