'use client';

import React, { useState, useCallback } from 'react';
import { CalendarContainer } from './CalendarContainer';
import { CalendarEvent } from '@/types';
import { useTeam } from '@/components/team/TeamProvider';
import { Plus } from 'lucide-react';
import { LazyEventModal } from '@/lib/performance/lazy-components';
import { usePerformanceMonitor } from '@/hooks/usePerformance';

interface CalendarPageProps {
  // 保持向后兼容的回调函数
  onCreateEvent?: (date?: Date) => void;
  onEditEvent?: (event: CalendarEvent) => void;
}

export function CalendarPage({
  onCreateEvent,
  onEditEvent,
}: CalendarPageProps) {
  const { currentTeam } = useTeam();
  const { startMeasure, endMeasure } = usePerformanceMonitor();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    event?: CalendarEvent;
    initialDate?: Date;
  }>({
    isOpen: false,
    mode: 'create',
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // 刷新日历数据
  const refreshCalendar = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // 处理事件点击
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);

    // 如果有外部回调，调用它
    if (onEditEvent) {
      onEditEvent(event);
    } else {
      // 否则打开内置模态框
      setModalState({
        isOpen: true,
        mode: 'view',
        event,
      });
    }
  };

  // 处理日期点击（创建新事件）
  const handleDateClick = (date: Date) => {
    // 如果有外部回调，调用它
    if (onCreateEvent) {
      onCreateEvent(date);
    } else {
      // 否则打开内置模态框
      setModalState({
        isOpen: true,
        mode: 'create',
        initialDate: date,
      });
    }
  };

  // 处理创建事件按钮点击
  const handleCreateEventClick = () => {
    if (onCreateEvent) {
      onCreateEvent();
    } else {
      setModalState({
        isOpen: true,
        mode: 'create',
      });
    }
  };

  // 处理事件更新
  const handleEventUpdate = async (
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<void> => {
    if (!currentTeam) return;

    const response = await fetch(
      `/api/teams/${currentTeam.id}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update event');
    }

    // 刷新日历数据
    refreshCalendar();
  };

  // 处理模态框关闭
  const handleModalClose = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
    });
    setSelectedEvent(null);
  };

  // 处理事件创建成功
  const handleEventCreated = (event: CalendarEvent) => {
    refreshCalendar();
  };

  // 处理事件更新成功
  const handleEventUpdated = (event: CalendarEvent) => {
    refreshCalendar();
  };

  // 处理事件删除成功
  const handleEventDeleted = (eventId: string) => {
    refreshCalendar();
  };

  return (
    <div className="calendar-page">
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              团队日历
            </h1>
            {currentTeam && (
              <p className="text-sm md:text-base text-gray-600 mt-1 truncate">
                {currentTeam.name}
              </p>
            )}
          </div>

          <button
            onClick={handleCreateEventClick}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 md:py-2 rounded-lg md:rounded-md font-medium transition-colors touch-manipulation self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 mr-2 inline sm:hidden" />
            创建事件
          </button>
        </div>
      </div>

      <CalendarContainer
        key={refreshKey}
        onEventClick={handleEventClick}
        onDateClick={handleDateClick}
        onEventUpdate={handleEventUpdate}
      />

      {/* 事件模态框 - 懒加载 */}
      <LazyEventModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        event={modalState.event}
        initialDate={modalState.initialDate}
        mode={modalState.mode}
        onEventCreated={handleEventCreated}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />
    </div>
  );
}
