'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent, CalendarView as ViewType } from '@/types';
import { useCalendarSwipe } from '@/hooks/useSwipeGesture';
import { VirtualEventList } from '@/components/ui/virtual-list';

interface CalendarViewProps {
  events: CalendarEvent[];
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onDateNavigate?: (date: Date) => void;
  loading?: boolean;
}

export function CalendarView({
  events,
  view,
  onViewChange,
  onEventClick,
  onDateClick,
  onEventDrop,
  onEventResize,
  onDateNavigate,
  loading = false,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  // 将 CalendarEvent 转换为 FullCalendar 事件格式
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    allDay: event.isAllDay,
    backgroundColor: event.color,
    borderColor: event.color,
    textColor: getTextColor(event.color),
    extendedProps: {
      category: event.category,
      location: event.location,
      description: event.description,
      createdBy: event.createdBy,
      originalEvent: event,
    },
  }));

  // 获取 FullCalendar 视图名称
  const getFullCalendarView = (view: ViewType): string => {
    switch (view) {
      case 'month':
        return 'dayGridMonth';
      case 'week':
        return 'timeGridWeek';
      case 'list':
        return 'listWeek';
      default:
        return 'dayGridMonth';
    }
  };

  // 处理事件点击
  const handleEventClick = useCallback(
    (info: any) => {
      const originalEvent = info.event.extendedProps.originalEvent;
      if (originalEvent) {
        onEventClick(originalEvent);
      }
    },
    [onEventClick]
  );

  // 处理日期点击
  const handleDateClick = useCallback(
    (info: any) => {
      onDateClick(new Date(info.date));
    },
    [onDateClick]
  );

  // 处理事件拖拽
  const handleEventDrop = useCallback(
    (info: any) => {
      if (onEventDrop) {
        const eventId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end || info.event.start;
        onEventDrop(eventId, newStart, newEnd);
      }
    },
    [onEventDrop]
  );

  // 处理事件调整大小
  const handleEventResize = useCallback(
    (info: any) => {
      if (onEventResize) {
        const eventId = info.event.id;
        const newStart = info.event.start;
        const newEnd = info.event.end;
        onEventResize(eventId, newStart, newEnd);
      }
    },
    [onEventResize]
  );

  // 处理日期导航
  const handleDateNavigate = useCallback(
    (info: any) => {
      const newDate = new Date(info.start);
      setCurrentDate(newDate);
      if (onDateNavigate) {
        onDateNavigate(newDate);
      }
    },
    [onDateNavigate]
  );

  // 导航到今天
  const navigateToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    if (onDateNavigate) {
      onDateNavigate(today);
    }
  }, [onDateNavigate]);

  // 导航到上一个时间段
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'list':
        newDate.setDate(newDate.getDate() - 7);
        break;
    }
    setCurrentDate(newDate);
    if (onDateNavigate) {
      onDateNavigate(newDate);
    }
  }, [currentDate, view, onDateNavigate]);

  // 导航到下一个时间段
  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'list':
        newDate.setDate(newDate.getDate() + 7);
        break;
    }
    setCurrentDate(newDate);
    if (onDateNavigate) {
      onDateNavigate(newDate);
    }
  }, [currentDate, view, onDateNavigate]);

  // 格式化当前日期标题
  const formatDateTitle = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    switch (view) {
      case 'month':
        return `${year}年${month}月`;
      case 'week':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${year}年${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}-${endOfWeek.getDate()}日`;
        } else {
          return `${startOfWeek.getFullYear()}年${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日 - ${endOfWeek.getFullYear()}年${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`;
        }
      case 'list':
        return `${year}年${month}月 事件列表`;
      default:
        return `${year}年${month}月`;
    }
  }, [currentDate, view]);

  // 设置滑动手势支持
  const { attachListeners, detachListeners } = useCalendarSwipe({
    onSwipeLeft: navigateNext,
    onSwipeRight: navigatePrevious,
  });

  // 附加滑动监听器
  useEffect(() => {
    if (calendarRef.current) {
      attachListeners(calendarRef.current);
    }

    return () => {
      detachListeners();
    };
  }, [attachListeners, detachListeners]);

  return (
    <div className="calendar-container">
      {/* 导航和视图控制栏 - 移动端优化 */}
      <div className="mb-4 space-y-3 md:space-y-0">
        {/* 移动端：垂直布局，桌面端：水平布局 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* 日期导航 */}
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="flex gap-1">
              <button
                onClick={navigatePrevious}
                className="p-3 md:p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                title="上一个"
              >
                <svg
                  className="w-6 h-6 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={navigateToToday}
                className="px-4 py-3 md:px-3 md:py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              >
                今天
              </button>
              <button
                onClick={navigateNext}
                className="p-3 md:p-2 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
                title="下一个"
              >
                <svg
                  className="w-6 h-6 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
              {formatDateTitle()}
            </h2>
          </div>

          {/* 视图切换按钮 - 移动端优化 */}
          <div className="flex gap-1 md:gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onViewChange('month')}
              className={`flex-1 md:flex-none px-3 py-2 md:px-4 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                view === 'month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-white hover:shadow-sm'
              }`}
            >
              <span className="md:hidden">月</span>
              <span className="hidden md:inline">月视图</span>
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`flex-1 md:flex-none px-3 py-2 md:px-4 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                view === 'week'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-white hover:shadow-sm'
              }`}
            >
              <span className="md:hidden">周</span>
              <span className="hidden md:inline">周视图</span>
            </button>
            <button
              onClick={() => onViewChange('list')}
              className={`flex-1 md:flex-none px-3 py-2 md:px-4 rounded-md text-sm font-medium transition-colors touch-manipulation ${
                view === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-white hover:shadow-sm'
              }`}
            >
              <span className="md:hidden">列表</span>
              <span className="hidden md:inline">列表视图</span>
            </button>
          </div>
        </div>
      </div>

      {/* 日历组件 - 支持滑动手势 */}
      <div
        ref={calendarRef}
        className={`calendar-wrapper ${loading ? 'opacity-50' : ''} touch-pan-y`}
      >
        {view === 'list' && events.length > 50 ? (
          // 使用虚拟滚动处理大量事件
          <VirtualEventList
            events={events.map(event => ({
              id: event.id,
              title: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
              category: event.category,
              color: event.color,
              location: event.location,
            }))}
            onEventClick={onEventClick}
            containerHeight={600}
            itemHeight={80}
          />
        ) : (
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            initialView={getFullCalendarView(view)}
            initialDate={currentDate}
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={handleDateNavigate}
            editable={true}
            droppable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            headerToolbar={false} // 禁用默认头部，使用自定义导航
            height="auto"
            locale="zh-cn"
            buttonText={{
              today: '今天',
              month: '月',
              week: '周',
              day: '日',
              list: '列表',
            }}
            allDayText="全天"
            noEventsText="暂无事件"
            moreLinkText="更多"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            dayHeaderFormat={{
              weekday: 'short',
              month: 'numeric',
              day: 'numeric',
            }}
            titleFormat={{
              year: 'numeric',
              month: 'long',
            }}
            // 自定义事件渲染
            eventContent={eventInfo => {
              const { event } = eventInfo;
              const category = event.extendedProps.category;
              const location = event.extendedProps.location;

              return (
                <div className="fc-event-content-custom">
                  <div className="fc-event-title-wrapper">
                    <span className="fc-event-category-badge">
                      {getCategoryIcon(category)}
                    </span>
                    <span className="fc-event-title">{event.title}</span>
                  </div>
                  {location && (
                    <div className="fc-event-location text-xs opacity-75">
                      📍 {location}
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}

// 辅助函数：根据背景色获取合适的文字颜色
function getTextColor(backgroundColor: string): string {
  // 简单的颜色对比度计算
  const color = backgroundColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

// 辅助函数：获取分类图标
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'meeting':
      return '👥';
    case 'task':
      return '📋';
    case 'reminder':
      return '⏰';
    default:
      return '📅';
  }
}
