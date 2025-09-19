/**
 * Tests for PWA components
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './test-utils';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { OfflineDetector } from '@/components/pwa/OfflineDetector';
import { PWASettings } from '@/components/pwa/PWASettings';
import { PWAInitializer } from '@/components/pwa/PWAInitializer';

// Mock service worker registration
const mockServiceWorkerRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: 'http://localhost/',
  update: jest.fn(),
  unregister: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock navigator
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
    ready: Promise.resolve(mockServiceWorkerRegistration),
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('PWAInstallPrompt', () => {
  let mockBeforeInstallPromptEvent: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBeforeInstallPromptEvent = {
      preventDefault: jest.fn(),
      prompt: jest.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    // Mock the beforeinstallprompt event
    Object.defineProperty(window, 'addEventListener', {
      value: jest.fn((event, handler) => {
        if (event === 'beforeinstallprompt') {
          setTimeout(() => handler(mockBeforeInstallPromptEvent), 100);
        }
      }),
      writable: true,
    });
  });

  it('shows install prompt when available', async () => {
    render(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('安装应用')).toBeInTheDocument();
    });

    expect(
      screen.getByText('将此应用安装到您的设备上以获得更好的体验')
    ).toBeInTheDocument();
  });

  it('handles install button click', async () => {
    const user = userEvent.setup();

    render(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('安装应用')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '立即安装' }));

    expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled();
  });

  it('hides prompt after installation', async () => {
    const user = userEvent.setup();

    render(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('安装应用')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '立即安装' }));

    await waitFor(() => {
      expect(screen.queryByText('安装应用')).not.toBeInTheDocument();
    });
  });

  it('allows dismissing the prompt', async () => {
    const user = userEvent.setup();

    render(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('安装应用')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '暂不安装' }));

    expect(screen.queryByText('安装应用')).not.toBeInTheDocument();
  });

  it('does not show when already installed', () => {
    // Mock standalone mode
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      writable: true,
    });

    render(<PWAInstallPrompt />);

    expect(screen.queryByText('安装应用')).not.toBeInTheDocument();
  });
});

describe('OfflineDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows offline message when offline', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    render(<OfflineDetector />);

    expect(screen.getByText('您当前处于离线状态')).toBeInTheDocument();
    expect(screen.getByText('某些功能可能无法使用')).toBeInTheDocument();
  });

  it('does not show message when online', () => {
    // Mock online state
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    render(<OfflineDetector />);

    expect(screen.queryByText('您当前处于离线状态')).not.toBeInTheDocument();
  });

  it('responds to online/offline events', () => {
    // Mock online state initially
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    render(<OfflineDetector />);

    expect(screen.queryByText('您当前处于离线状态')).not.toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    fireEvent(window, new Event('offline'));

    expect(screen.getByText('您当前处于离线状态')).toBeInTheDocument();

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    fireEvent(window, new Event('online'));

    expect(screen.queryByText('您当前处于离线状态')).not.toBeInTheDocument();
  });

  it('shows retry button when offline', async () => {
    const user = userEvent.setup();

    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    render(<OfflineDetector />);

    const retryButton = screen.getByRole('button', { name: '重试连接' });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    // Should attempt to reload or check connection
    expect(retryButton).toBeInTheDocument();
  });
});

describe('PWASettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  it('renders PWA settings options', () => {
    render(<PWASettings />);

    expect(screen.getByText('PWA 设置')).toBeInTheDocument();
    expect(screen.getByText('启用推送通知')).toBeInTheDocument();
    expect(screen.getByText('离线缓存')).toBeInTheDocument();
    expect(screen.getByText('自动更新')).toBeInTheDocument();
  });

  it('toggles notification settings', async () => {
    const user = userEvent.setup();

    // Mock Notification API
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: jest.fn(() => Promise.resolve('granted')),
      },
      writable: true,
    });

    render(<PWASettings />);

    const notificationToggle = screen.getByRole('checkbox', {
      name: /启用推送通知/,
    });

    await user.click(notificationToggle);

    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it('manages cache settings', async () => {
    const user = userEvent.setup();

    render(<PWASettings />);

    const cacheToggle = screen.getByRole('checkbox', { name: /离线缓存/ });

    await user.click(cacheToggle);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'pwa-cache-enabled',
      'true'
    );
  });

  it('clears cache when requested', async () => {
    const user = userEvent.setup();

    // Mock caches API
    Object.defineProperty(global, 'caches', {
      value: {
        keys: jest.fn(() => Promise.resolve(['cache1', 'cache2'])),
        delete: jest.fn(() => Promise.resolve(true)),
      },
      writable: true,
    });

    render(<PWASettings />);

    await user.click(screen.getByRole('button', { name: '清除缓存' }));

    await waitFor(() => {
      expect(caches.keys).toHaveBeenCalled();
      expect(caches.delete).toHaveBeenCalledWith('cache1');
      expect(caches.delete).toHaveBeenCalledWith('cache2');
    });
  });

  it('shows cache size information', async () => {
    // Mock storage estimate API
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: jest.fn(() =>
          Promise.resolve({
            usage: 1024 * 1024, // 1MB
            quota: 1024 * 1024 * 100, // 100MB
          })
        ),
      },
      writable: true,
    });

    render(<PWASettings />);

    await waitFor(() => {
      expect(screen.getByText(/缓存大小/)).toBeInTheDocument();
    });
  });
});

describe('PWAInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers service worker on mount', async () => {
    render(<PWAInitializer />);

    await waitFor(() => {
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  it('handles service worker registration errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(
      new Error('Registration failed')
    );

    render(<PWAInitializer />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Service Worker registration failed:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('sets up update listener', async () => {
    render(<PWAInitializer />);

    await waitFor(() => {
      expect(
        mockServiceWorkerRegistration.addEventListener
      ).toHaveBeenCalledWith('updatefound', expect.any(Function));
    });
  });

  it('handles service worker updates', async () => {
    const mockNewWorker = {
      state: 'installing',
      addEventListener: jest.fn(),
    };

    mockServiceWorkerRegistration.installing = mockNewWorker;

    render(<PWAInitializer />);

    await waitFor(() => {
      expect(mockNewWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function)
      );
    });
  });

  it('shows update notification when available', async () => {
    const mockNewWorker = {
      state: 'installed',
      addEventListener: jest.fn((event, handler) => {
        if (event === 'statechange') {
          setTimeout(handler, 100);
        }
      }),
    };

    mockServiceWorkerRegistration.waiting = mockNewWorker;

    render(<PWAInitializer />);

    await waitFor(() => {
      expect(screen.getByText('应用更新可用')).toBeInTheDocument();
    });
  });

  it('applies update when user confirms', async () => {
    const user = userEvent.setup();

    const mockNewWorker = {
      state: 'installed',
      postMessage: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'statechange') {
          setTimeout(handler, 100);
        }
      }),
    };

    mockServiceWorkerRegistration.waiting = mockNewWorker;

    render(<PWAInitializer />);

    await waitFor(() => {
      expect(screen.getByText('应用更新可用')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '立即更新' }));

    expect(mockNewWorker.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    });
  });
});
