'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 计算总高度
  const totalHeight = items.length * itemHeight;

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, visibleRange]);

  // 处理滚动事件
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // 滚动到指定索引
  const scrollToIndex = useCallback(
    (index: number) => {
      if (scrollElementRef.current) {
        const scrollTop = index * itemHeight;
        scrollElementRef.current.scrollTop = scrollTop;
        setScrollTop(scrollTop);
      }
    },
    [itemHeight]
  );

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleRange.startIndex * itemHeight}px)`,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 虚拟化事件列表组件
interface VirtualEventListProps {
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    category: string;
    color: string;
    location?: string;
  }>;
  onEventClick: (event: any) => void;
  containerHeight?: number;
  itemHeight?: number;
}

export function VirtualEventList({
  events,
  onEventClick,
  containerHeight = 400,
  itemHeight = 80,
}: VirtualEventListProps) {
  const renderEventItem = useCallback(
    (event: any, index: number) => (
      <div
        className="w-full p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onEventClick(event)}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: event.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <span>
                {new Date(event.startTime).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {event.location && (
                <>
                  <span>•</span>
                  <span className="truncate">📍 {event.location}</span>
                </>
              )}
            </div>
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {getCategoryLabel(event.category)}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    [onEventClick]
  );

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        暂无事件
      </div>
    );
  }

  return (
    <VirtualList
      items={events}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={renderEventItem}
      className="border border-gray-200 rounded-lg"
    />
  );
}

// 辅助函数
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'meeting':
      return '👥 会议';
    case 'task':
      return '📋 任务';
    case 'reminder':
      return '⏰ 提醒';
    default:
      return '📅 事件';
  }
}
