import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import {
  OfflineDetector,
  PWAInstallPrompt,
  PWAInitializer,
} from '@/components/pwa';
import { PerformanceInitializer } from '@/components/performance/PerformanceInitializer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: '团队日历同步器',
    template: '%s | 团队日历同步器',
  },
  description:
    '轻量级团队日历管理 PWA 应用，支持团队协作、事件管理和 iCalendar 订阅功能',
  keywords: ['团队日历', '日程管理', 'PWA', '协作工具', 'iCalendar'],
  authors: [{ name: '团队日历同步器' }],
  creator: '团队日历同步器',
  publisher: '团队日历同步器',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://your-domain.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://your-domain.com',
    title: '团队日历同步器',
    description: '轻量级团队日历管理 PWA 应用',
    siteName: '团队日历同步器',
  },
  twitter: {
    card: 'summary_large_image',
    title: '团队日历同步器',
    description: '轻量级团队日历管理 PWA 应用',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.svg',
    shortcut: '/icons/icon-192x192.svg',
    apple: '/icons/icon-192x192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <PWAInitializer />
          <PerformanceInitializer />
          <OfflineDetector>
            <div id="root">{children}</div>
            <PWAInstallPrompt />
          </OfflineDetector>
        </AuthProvider>
      </body>
    </html>
  );
}
