'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarView } from './CalendarView';
import { VirtualEventList } from '@/components/ui/virtual-list';
import {
  CalendarEvent,
  CalendarView as ViewType,
  EventCategory,
} from '@/types';
import { useTeam } from '@/components/team/TeamProvider';
import {
  useOptimizedFetch,
  useDebounce,
  useThrottle,
  usePerformanceMonitor,
} from '@/hooks/usePerformance';
import {
  optimizedFetch,
  cacheInvalidation,
  prefetchManager,
} from '@/lib/performance/api-cache';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/components/ui/toast';
import { ErrorRecovery } from '@/components/error/ErrorRecovery';
import {
  DataLoadingState,
  CalendarSkeleton,
} from '@/components/ui/loading-states';

interface CalendarContainerProps {
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventUpdate?: (
    eventId: string,
    updates: Partial<CalendarEvent>
  ) => Promise<void>;
}

export function CalendarContainer({
  onEventClick,
  onDateClick,
  onEventUpdate,
}: CalendarContainerProps) {
  const { currentTeam } = useTeam();
  const [view, setView] = useState<ViewType>('month');
  const [filters, setFilters] = useState({
    category: null as EventCategory | null,
    startDate: null as string | null,
    endDate: null as string | null,
    searchQuery: '',
  });
  const [sortBy, setSortBy] = useState<'startTime' | 'title' | 'category'>(
    'startTime'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 错误处理和用户反馈
  const { handleError, withErrorHandling } = useErrorHandler();
  const { success, error: showError } = useToast();

  // 性能监控
  const { startMeasure, endMeasure } = usePerformanceMonitor();

  // 防抖搜索查询
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  // 构建 API URL
  const apiUrl = useMemo(() => {
    if (!currentTeam) return null;

    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.category) params.append('category', filters.category);

    return `/api/teams/${currentTeam.id}/events?${params.toString()}`;
  }, [currentTeam, filters.startDate, filters.endDate, filters.category]);

  // 使用优化的数据获取
  const {
    data: eventsResponse,
    loading,
    error,
    refetch,
  } = useOptimizedFetch<{
    success: boolean;
    data: { events: CalendarEvent[] };
  }>(apiUrl, {
    cache: true,
    cacheTTL: 2 * 60 * 1000, // 2分钟缓存
    refetchOnWindowFocus: true,
    onSuccess: () => {
      endMeasure('Events fetch');
    },
    onError: error => {
      handleError(error);
      showError('获取日历事件失败', '请检查网络连接后重试');
    },
  });

  const events = eventsResponse?.data?.events || [];

  // 节流的事件更新处理
  const throttledEventUpdate = useThrottle(
    withErrorHandling(
      async (eventId: string, updates: Partial<CalendarEvent>) => {
        if (!onEventUpdate || !currentTeam) return;

        await onEventUpdate(eventId, updates);
        // 使缓存失效以确保数据一致性
        cacheInvalidation.invalidateEvents(currentTeam.id);
        // 重新获取数据
        await refetch();
        success('事件更新成功');
      }
    ),
    500
  );

  // 处理事件拖拽更新
  const handleEventDrop = useCallback(
    withErrorHandling(async (eventId: string, newStart: Date, newEnd: Date) => {
      startMeasure();
      await throttledEventUpdate(eventId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      endMeasure('Event drop update');
    }),
    [throttledEventUpdate, startMeasure, endMeasure, withErrorHandling]
  );

  // 处理事件大小调整
  const handleEventResize = useCallback(
    withErrorHandling(async (eventId: string, newStart: Date, newEnd: Date) => {
      startMeasure();
      await throttledEventUpdate(eventId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      endMeasure('Event resize update');
    }),
    [throttledEventUpdate, startMeasure, endMeasure, withErrorHandling]
  );

  // 处理视图变化
  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);

    // 根据视图调整日期范围过滤器
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (newView) {
      case 'week':
        // 获取当前周的开始和结束日期
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;

      case 'month':
        // 获取当前月的开始和结束日期
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
        break;

      case 'list':
        // 列表视图显示未来一个月的事件
        startDate = now.toISOString().split('T')[0];
        const futureDate = new Date(now);
        futureDate.setMonth(now.getMonth() + 1);
        endDate = futureDate.toISOString().split('T')[0];
        break;
    }

    setFilters(prev => ({
      ...prev,
      startDate,
      endDate,
    }));
  }, []);

  // 处理分类筛选
  const handleCategoryFilter = useCallback((category: EventCategory | null) => {
    setFilters(prev => ({
      ...prev,
      category,
    }));
  }, []);

  // 处理搜索
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  // 处理排序
  const handleSort = useCallback(
    (field: 'startTime' | 'title' | 'category', order: 'asc' | 'desc') => {
      setSortBy(field);
      setSortOrder(order);
    },
    []
  );

  // 过滤和排序事件（优化版本）
  const filteredAndSortedEvents = useMemo(() => {
    startMeasure();

    let filtered = events;

    // 应用搜索过滤（使用防抖的搜索查询）
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        event =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      );
    }

    // 应用分类过滤
    if (filters.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    // 应用排序
    filtered.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortBy) {
        case 'startTime':
          aValue = new Date(a.startTime);
          bValue = new Date(b.startTime);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          aValue = new Date(a.startTime);
          bValue = new Date(b.startTime);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    endMeasure('Events filtering and sorting');
    return filtered;
  }, [
    events,
    debouncedSearchQuery,
    filters.category,
    sortBy,
    sortOrder,
    startMeasure,
    endMeasure,
  ]);

  // 预取相关数据
  useEffect(() => {
    if (currentTeam) {
      // 预取下个月的事件数据
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStart = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        1
      );
      const nextMonthEnd = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0
      );

      const nextMonthParams = new URLSearchParams({
        startDate: nextMonthStart.toISOString().split('T')[0],
        endDate: nextMonthEnd.toISOString().split('T')[0],
      });

      prefetchManager.prefetch(
        `/api/teams/${currentTeam.id}/events?${nextMonthParams.toString()}`
      );
    }
  }, [currentTeam]);

  // 当团队切换时重置状态
  useEffect(() => {
    setFilters({
      category: null,
      startDate: null,
      endDate: null,
      searchQuery: '',
    });
    setSortBy('startTime');
    setSortOrder('asc');

    // 清理相关缓存
    if (currentTeam) {
      cacheInvalidation.invalidateEvents(currentTeam.id);
    }
  }, [currentTeam?.id]);

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">请先选择一个团队</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <DataLoadingState
        loading={loading}
        error={error}
        data={events}
        skeleton={<CalendarSkeleton />}
        onRetry={refetch}
        emptyMessage="暂无日历事件"
      >
        {/* 搜索和筛选器 - 移动端优化 */}
        <div className="mb-4 space-y-3">
          {/* 搜索栏和统计信息 */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
            <div className="flex-1 md:max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索事件..."
                  value={filters.searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 md:py-2 border border-gray-300 rounded-lg md:rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm touch-manipulation"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {filters.searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600 active:text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 排序控件和统计信息 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  排序:
                </span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={e => {
                    const [field, order] = e.target.value.split('-') as [
                      typeof sortBy,
                      typeof sortOrder,
                    ];
                    handleSort(field, order);
                  }}
                  className="flex-1 sm:flex-none text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                >
                  <option value="startTime-asc">时间 ↑</option>
                  <option value="startTime-desc">时间 ↓</option>
                  <option value="title-asc">标题 A-Z</option>
                  <option value="title-desc">标题 Z-A</option>
                  <option value="category-asc">分类 ↑</option>
                  <option value="category-desc">分类 ↓</option>
                </select>
              </div>

              <div className="text-sm text-gray-500 text-center sm:text-left">
                显示 {filteredAndSortedEvents.length} / {events.length} 个事件
              </div>
            </div>
          </div>

          {/* 分类筛选器 - 移动端优化 */}
          <div className="space-y-2">
            <span className="text-sm text-gray-600 block md:hidden">
              分类筛选:
            </span>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 hidden md:block">
                分类:
              </span>
              <button
                onClick={() => handleCategoryFilter(null)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                  filters.category === null
                    ? 'bg-blue-100 text-blue-800 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => handleCategoryFilter('meeting')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                  filters.category === 'meeting'
                    ? 'bg-green-100 text-green-800 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                👥 会议
              </button>
              <button
                onClick={() => handleCategoryFilter('task')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                  filters.category === 'task'
                    ? 'bg-orange-100 text-orange-800 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                📋 任务
              </button>
              <button
                onClick={() => handleCategoryFilter('reminder')}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                  filters.category === 'reminder'
                    ? 'bg-purple-100 text-purple-800 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                ⏰ 提醒
              </button>
            </div>
          </div>
        </div>

        {/* 日历视图 */}
        <CalendarView
          events={filteredAndSortedEvents}
          view={view}
          onViewChange={handleViewChange}
          onEventClick={onEventClick}
          onDateClick={onDateClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onDateNavigate={date => {
            // 可以在这里处理日期导航的副作用，比如更新URL或记录状态
            console.log('Date navigated to:', date);
          }}
          loading={loading}
        />
      </DataLoadingState>
    </div>
  );
}
