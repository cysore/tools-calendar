/**
 * Tests for custom hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { usePerformance } from '@/hooks/usePerformance';
import { useSecurity } from '@/hooks/useSecurity';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useAuth Hook', () => {
  const { useSession, signIn, signOut } = require('next-auth/react');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns authenticated user when session exists', () => {
    useSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(result.current.status).toBe('authenticated');
  });

  it('returns null user when not authenticated', () => {
    useSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('handles login', async () => {
    useSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    signIn.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'test@example.com',
      password: 'password',
      redirect: false,
    });
  });

  it('handles logout', async () => {
    useSession.mockReturnValue({
      data: { user: { id: 'user-1' } },
      status: 'authenticated',
    });

    signOut.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it('handles registration', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register(
        'test@example.com',
        'password',
        'Test User'
      );
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      }),
    });
  });

  it('handles password reset', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.resetPassword('test@example.com');
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });
  });
});

describe('useErrorHandler Hook', () => {
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('handles and logs errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(mockConsoleError).toHaveBeenCalledWith('Error handled:', testError);
  });

  it('handles API errors with custom messages', () => {
    const { result } = renderHook(() => useErrorHandler());

    const apiError = {
      message: 'API Error',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };

    act(() => {
      result.current.handleApiError(apiError);
    });

    expect(mockConsoleError).toHaveBeenCalledWith(
      'API Error handled:',
      apiError
    );
  });

  it('provides error recovery functions', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(typeof result.current.retry).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('tracks error state', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();

    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.error).toBe(testError);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('usePerformance Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
    } as any;
  });

  it('measures component render time', () => {
    const { result } = renderHook(() => usePerformance('TestComponent'));

    act(() => {
      result.current.startMeasure('render');
    });

    act(() => {
      result.current.endMeasure('render');
    });

    expect(performance.mark).toHaveBeenCalledWith('TestComponent-render-start');
    expect(performance.mark).toHaveBeenCalledWith('TestComponent-render-end');
    expect(performance.measure).toHaveBeenCalledWith(
      'TestComponent-render',
      'TestComponent-render-start',
      'TestComponent-render-end'
    );
  });

  it('tracks memory usage', () => {
    // Mock memory API
    (global as any).performance.memory = {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    };

    const { result } = renderHook(() => usePerformance('TestComponent'));

    const memoryInfo = result.current.getMemoryUsage();

    expect(memoryInfo).toEqual({
      used: 1000000,
      total: 2000000,
      limit: 4000000,
    });
  });

  it('provides performance metrics', () => {
    const { result } = renderHook(() => usePerformance('TestComponent'));

    const metrics = result.current.getMetrics();

    expect(metrics).toHaveProperty('renderTime');
    expect(metrics).toHaveProperty('memoryUsage');
    expect(metrics).toHaveProperty('timestamp');
  });
});

describe('useSecurity Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sanitizes HTML input', () => {
    const { result } = renderHook(() => useSecurity());

    const dirtyHtml = '<script>alert("xss")</script><p>Safe content</p>';
    const cleanHtml = result.current.sanitizeHtml(dirtyHtml);

    expect(cleanHtml).toBe('Safe content');
    expect(cleanHtml).not.toContain('<script>');
  });

  it('validates input against XSS', () => {
    const { result } = renderHook(() => useSecurity());

    const safeInput = 'This is safe input';
    const dangerousInput = '<script>alert("xss")</script>';

    expect(result.current.validateInput(safeInput)).toBe(true);
    expect(result.current.validateInput(dangerousInput)).toBe(false);
  });

  it('generates secure tokens', () => {
    const { result } = renderHook(() => useSecurity());

    const token1 = result.current.generateSecureToken();
    const token2 = result.current.generateSecureToken();

    expect(typeof token1).toBe('string');
    expect(typeof token2).toBe('string');
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(0);
  });

  it('validates CSRF tokens', () => {
    const { result } = renderHook(() => useSecurity());

    const token = result.current.generateCSRFToken();

    expect(result.current.validateCSRFToken(token)).toBe(true);
    expect(result.current.validateCSRFToken('invalid-token')).toBe(false);
  });
});

describe('useSwipeGesture Hook', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement('div');
    jest.clearAllMocks();
  });

  it('detects swipe left gesture', () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();

    renderHook(() =>
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
      })
    );

    // Simulate touch events
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 50, clientY: 100 } as Touch],
    });

    mockElement.dispatchEvent(touchStart);
    mockElement.dispatchEvent(touchEnd);

    expect(onSwipeLeft).toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('detects swipe right gesture', () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();

    renderHook(() =>
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
      })
    );

    // Simulate touch events
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 50, clientY: 100 } as Touch],
    });

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
    });

    mockElement.dispatchEvent(touchStart);
    mockElement.dispatchEvent(touchEnd);

    expect(onSwipeRight).toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('ignores short swipes', () => {
    const onSwipeLeft = jest.fn();
    const onSwipeRight = jest.fn();

    renderHook(() =>
      useSwipeGesture(mockElement, {
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    );

    // Simulate short swipe
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 80, clientY: 100 } as Touch],
    });

    mockElement.dispatchEvent(touchStart);
    mockElement.dispatchEvent(touchEnd);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(
      mockElement,
      'removeEventListener'
    );

    const { unmount } = renderHook(() =>
      useSwipeGesture(mockElement, {
        onSwipeLeft: jest.fn(),
        onSwipeRight: jest.fn(),
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchstart',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchend',
      expect.any(Function)
    );
  });
});
