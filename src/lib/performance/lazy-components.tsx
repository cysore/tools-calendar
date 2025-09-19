'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// 懒加载组件包装器
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// 预定义的懒加载组件
export const LazyCalendarView = createLazyComponent(
  () =>
    import('@/components/calendar/CalendarView').then(module => ({
      default: module.CalendarView,
    })),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
);

export const LazyEventModal = createLazyComponent(
  () =>
    import('@/components/calendar/EventModal').then(module => ({
      default: module.EventModal,
    })),
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

export const LazyTeamSettings = createLazyComponent(
  () =>
    import('@/components/team/TeamSettings').then(module => ({
      default: module.TeamSettings,
    })),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
);

export const LazySubscriptionSettings = createLazyComponent(
  () =>
    import('@/components/team/SubscriptionSettings').then(module => ({
      default: module.SubscriptionSettings,
    })),
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
);

// 动态导入工具函数
export const dynamicImports = {
  // 日历相关组件
  CalendarView: () =>
    import('@/components/calendar/CalendarView').then(module => ({
      default: module.CalendarView,
    })),
  EventModal: () =>
    import('@/components/calendar/EventModal').then(module => ({
      default: module.EventModal,
    })),
  EventForm: () =>
    import('@/components/calendar/EventForm').then(module => ({
      default: module.EventForm,
    })),

  // 团队管理组件
  TeamSettings: () =>
    import('@/components/team/TeamSettings').then(module => ({
      default: module.TeamSettings,
    })),
  MemberManagement: () =>
    import('@/components/team/MemberManagement').then(module => ({
      default: module.MemberManagement,
    })),
  SubscriptionSettings: () =>
    import('@/components/team/SubscriptionSettings').then(module => ({
      default: module.SubscriptionSettings,
    })),
  CreateTeamDialog: () =>
    import('@/components/team/CreateTeamDialog').then(module => ({
      default: module.CreateTeamDialog,
    })),

  // PWA 组件
  PWAInstallPrompt: () =>
    import('@/components/pwa/PWAInstallPrompt').then(module => ({
      default: module.PWAInstallPrompt,
    })),
  PWASettings: () =>
    import('@/components/pwa/PWASettings').then(module => ({
      default: module.PWASettings,
    })),

  // 认证组件
  LoginPage: () => import('@/app/auth/login/page'),
  RegisterPage: () => import('@/app/auth/register/page'),
  ForgotPasswordPage: () => import('@/app/auth/forgot-password/page'),
};

// 路由级别的代码分割
export const routeComponents = {
  Dashboard: lazy(() => import('@/app/dashboard/page')),
  Login: lazy(() => import('@/app/auth/login/page')),
  Register: lazy(() => import('@/app/auth/register/page')),
  ForgotPassword: lazy(() => import('@/app/auth/forgot-password/page')),
  TeamJoin: lazy(() => import('@/app/teams/join/page')),
  Offline: lazy(() => import('@/app/offline/page')),
};

// 预加载函数
export const preloadComponent = (importFn: () => Promise<any>) => {
  // 在空闲时间预加载组件
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      importFn();
    });
  } else {
    // 降级到 setTimeout
    setTimeout(() => {
      importFn();
    }, 100);
  }
};

// 预加载关键组件
export const preloadCriticalComponents = () => {
  preloadComponent(dynamicImports.CalendarView);
  preloadComponent(dynamicImports.EventModal);
  preloadComponent(dynamicImports.TeamSettings);
};
