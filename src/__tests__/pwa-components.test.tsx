import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OfflineDetector, PWASettings } from '@/components/pwa';

// Mock the PWA utilities
jest.mock('@/lib/pwa-utils', () => ({
  isPWASupported: jest.fn(() => true),
  isPWAInstalled: jest.fn(() => false),
  getCacheSize: jest.fn(() => Promise.resolve(1024)),
  clearAllCaches: jest.fn(() => Promise.resolve()),
  formatCacheSize: jest.fn(bytes => `${bytes} B`),
  requestNotificationPermission: jest.fn(() => Promise.resolve('granted')),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('PWA Components', () => {
  describe('OfflineDetector', () => {
    it('renders children without offline alert when online', () => {
      render(
        <OfflineDetector>
          <div>Test Content</div>
        </OfflineDetector>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.queryByText(/离线状态/)).not.toBeInTheDocument();
    });
  });

  describe('PWASettings', () => {
    it('renders PWA settings when supported', () => {
      render(<PWASettings />);

      expect(screen.getByText('应用安装')).toBeInTheDocument();
      expect(screen.getByText('网络状态')).toBeInTheDocument();
      expect(screen.getByText('通知设置')).toBeInTheDocument();
      expect(screen.getByText('缓存管理')).toBeInTheDocument();
    });

    it('shows installation status', () => {
      render(<PWASettings />);

      expect(screen.getByText('未安装')).toBeInTheDocument();
    });

    it('shows online status', () => {
      render(<PWASettings />);

      expect(screen.getByText('在线')).toBeInTheDocument();
    });
  });
});
