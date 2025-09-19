/**
 * Tests for error handling components
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorFeedback } from '@/components/error/ErrorFeedback';
import { ErrorRecovery } from '@/components/error/ErrorRecovery';
import { GlobalErrorHandler } from '@/components/error/GlobalErrorHandler';

// Mock fetch
global.fetch = jest.fn();

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('出现了错误')).toBeInTheDocument();
    expect(screen.getByText('抱歉，应用遇到了意外错误')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('错误详情：')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('provides retry functionality', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('出现了错误')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('allows reporting errors', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: '报告错误' }));

    expect(fetch).toHaveBeenCalledWith('/api/error-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Test error',
        stack: expect.any(String),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: expect.any(String),
      }),
    });
  });

  it('logs errors to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});

describe('ErrorFeedback', () => {
  const mockError = new Error('Test error message');

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders error feedback form', () => {
    render(<ErrorFeedback error={mockError} />);

    expect(screen.getByText('错误反馈')).toBeInTheDocument();
    expect(screen.getByLabelText(/描述您遇到的问题/)).toBeInTheDocument();
    expect(screen.getByLabelText(/您的邮箱/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '发送反馈' })
    ).toBeInTheDocument();
  });

  it('submits feedback successfully', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<ErrorFeedback error={mockError} />);

    await user.type(
      screen.getByLabelText(/描述您遇到的问题/),
      'This is a test feedback'
    );
    await user.type(screen.getByLabelText(/您的邮箱/), 'test@example.com');

    await user.click(screen.getByRole('button', { name: '发送反馈' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/error-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: mockError.message,
          stack: mockError.stack,
          description: 'This is a test feedback',
          email: 'test@example.com',
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: expect.any(String),
        }),
      });
    });

    expect(screen.getByText('反馈已发送，感谢您的帮助！')).toBeInTheDocument();
  });

  it('handles submission errors', async () => {
    const user = userEvent.setup();

    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Submission failed' } }),
    });

    render(<ErrorFeedback error={mockError} />);

    await user.type(
      screen.getByLabelText(/描述您遇到的问题/),
      'This is a test feedback'
    );

    await user.click(screen.getByRole('button', { name: '发送反馈' }));

    await waitFor(() => {
      expect(screen.getByText('发送失败，请稍后重试')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(<ErrorFeedback error={mockError} />);

    await user.click(screen.getByRole('button', { name: '发送反馈' }));

    expect(screen.getByText('请描述您遇到的问题')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('includes error details in submission', () => {
    render(<ErrorFeedback error={mockError} />);

    expect(
      screen.getByText('错误信息：Test error message')
    ).toBeInTheDocument();
  });
});

describe('ErrorRecovery', () => {
  const mockOnRetry = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recovery options', () => {
    render(
      <ErrorRecovery
        error={new Error('Test error')}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('错误恢复')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '重试操作' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '重置应用' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '刷新页面' })
    ).toBeInTheDocument();
  });

  it('handles retry action', async () => {
    const user = userEvent.setup();

    render(
      <ErrorRecovery
        error={new Error('Test error')}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    await user.click(screen.getByRole('button', { name: '重试操作' }));

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('handles reset action', async () => {
    const user = userEvent.setup();

    render(
      <ErrorRecovery
        error={new Error('Test error')}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    await user.click(screen.getByRole('button', { name: '重置应用' }));

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('handles page refresh', async () => {
    const user = userEvent.setup();
    const mockReload = jest.fn();

    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ErrorRecovery
        error={new Error('Test error')}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    await user.click(screen.getByRole('button', { name: '刷新页面' }));

    expect(mockReload).toHaveBeenCalled();
  });

  it('shows error suggestions based on error type', () => {
    const networkError = new Error('Network error');
    networkError.name = 'NetworkError';

    render(
      <ErrorRecovery
        error={networkError}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/网络连接问题/)).toBeInTheDocument();
    expect(screen.getByText(/检查您的网络连接/)).toBeInTheDocument();
  });

  it('provides generic suggestions for unknown errors', () => {
    render(
      <ErrorRecovery
        error={new Error('Unknown error')}
        onRetry={mockOnRetry}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/尝试以下解决方案/)).toBeInTheDocument();
  });
});

describe('GlobalErrorHandler', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
    (fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('catches unhandled promise rejections', async () => {
    render(<GlobalErrorHandler />);

    // Simulate unhandled promise rejection
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.reject(new Error('Unhandled rejection')),
      reason: new Error('Unhandled rejection'),
    });

    window.dispatchEvent(rejectionEvent);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled promise rejection:',
        expect.any(Error)
      );
    });
  });

  it('catches global JavaScript errors', () => {
    render(<GlobalErrorHandler />);

    // Simulate global error
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Global error'),
      message: 'Global error',
      filename: 'test.js',
      lineno: 1,
      colno: 1,
    });

    window.dispatchEvent(errorEvent);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Global error caught:',
      expect.any(Error)
    );
  });

  it('reports errors to monitoring service', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<GlobalErrorHandler />);

    // Simulate error
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Test error'),
      message: 'Test error',
      filename: 'test.js',
      lineno: 1,
      colno: 1,
    });

    window.dispatchEvent(errorEvent);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/error-monitoring/immediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Test error',
          stack: expect.any(String),
          filename: 'test.js',
          lineno: 1,
          colno: 1,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: expect.any(String),
        }),
      });
    });
  });

  it('throttles error reporting', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<GlobalErrorHandler />);

    // Simulate multiple errors quickly
    for (let i = 0; i < 5; i++) {
      const errorEvent = new ErrorEvent('error', {
        error: new Error(`Test error ${i}`),
        message: `Test error ${i}`,
      });
      window.dispatchEvent(errorEvent);
    }

    await waitFor(() => {
      // Should only report the first error due to throttling
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<GlobalErrorHandler />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'error',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );
  });
});
