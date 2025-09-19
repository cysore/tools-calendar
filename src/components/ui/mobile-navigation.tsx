/**
 * Mobile-optimized navigation component
 */

'use client';

import React from 'react';
import { Calendar, Settings, Home, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileNavigationProps {
  activeTab: 'overview' | 'calendar' | 'settings';
  onTabChange: (tab: 'overview' | 'calendar' | 'settings') => void;
  onCreateEvent?: () => void;
  className?: string;
}

export function MobileNavigation({
  activeTab,
  onTabChange,
  onCreateEvent,
  className = '',
}: MobileNavigationProps) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb md:hidden ${className}`}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {/* 概览 */}
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => onTabChange('overview')}
          className="flex-1 flex-col h-12 max-w-20 touch-manipulation"
          size="sm"
        >
          <Home className="h-5 w-5 mb-1" />
          <span className="text-xs">概览</span>
        </Button>

        {/* 日历 */}
        <Button
          variant={activeTab === 'calendar' ? 'default' : 'ghost'}
          onClick={() => onTabChange('calendar')}
          className="flex-1 flex-col h-12 max-w-20 touch-manipulation"
          size="sm"
        >
          <Calendar className="h-5 w-5 mb-1" />
          <span className="text-xs">日历</span>
        </Button>

        {/* 创建事件 - 浮动按钮 */}
        {onCreateEvent && (
          <Button
            onClick={onCreateEvent}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg touch-manipulation"
            size="sm"
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
        )}

        {/* 设置 */}
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => onTabChange('settings')}
          className="flex-1 flex-col h-12 max-w-20 touch-manipulation"
          size="sm"
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-xs">设置</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Safe area padding utility for devices with notches/home indicators
 */
export function SafeAreaPadding({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`pb-safe ${className}`}>{children}</div>;
}
