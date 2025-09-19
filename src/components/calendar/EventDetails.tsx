'use client';

import React, { useState } from 'react';
import { CalendarEvent, EventCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/components/team/TeamProvider';
import { Download } from 'lucide-react';

interface EventDetailsProps {
  event: CalendarEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onDuplicate?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  loading?: boolean;
}

// 分类信息映射
const CATEGORY_INFO: Record<
  EventCategory,
  { label: string; icon: string; color: string }
> = {
  meeting: { label: '会议', icon: '👥', color: 'bg-green-100 text-green-800' },
  task: { label: '任务', icon: '📋', color: 'bg-orange-100 text-orange-800' },
  reminder: {
    label: '提醒',
    icon: '⏰',
    color: 'bg-purple-100 text-purple-800',
  },
};

export function EventDetails({
  event,
  onEdit,
  onDelete,
  onClose,
  onDuplicate,
  canEdit = false,
  canDelete = false,
  loading = false,
}: EventDetailsProps) {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const [exporting, setExporting] = useState(false);

  // 格式化日期时间显示
  const formatDateTime = (dateTime: string, isAllDay: boolean): string => {
    const date = new Date(dateTime);

    if (isAllDay) {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 计算事件持续时间
  const getDuration = (): string => {
    if (event.isAllDay) {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      return days === 1 ? '全天' : `${days} 天`;
    }

    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return `${diffMinutes} 分钟`;
    } else if (diffMinutes === 0) {
      return `${diffHours} 小时`;
    } else {
      return `${diffHours} 小时 ${diffMinutes} 分钟`;
    }
  };

  // 检查是否为事件创建者
  const isCreator = user?.id === event.createdBy;

  // 获取分类信息
  const categoryInfo = CATEGORY_INFO[event.category];

  // 导出单个事件
  const exportEvent = async () => {
    if (!currentTeam) return;

    try {
      setExporting(true);

      const response = await fetch(
        `/api/teams/${currentTeam.id}/events/${event.id}/export`
      );

      if (!response.ok) {
        throw new Error('Failed to export event');
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 事件标题和颜色 */}
      <div className="flex items-start gap-3">
        <div
          className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: event.color }}
        />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {event.title}
          </h2>

          {/* 分类标签 */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}
          >
            <span>{categoryInfo.icon}</span>
            <span>{categoryInfo.label}</span>
          </span>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="text-lg">🕒</span>
          <div>
            <div className="font-medium">
              {formatDateTime(event.startTime, event.isAllDay)}
            </div>
            {!event.isAllDay && (
              <div className="text-sm">
                至 {formatDateTime(event.endTime, event.isAllDay)}
              </div>
            )}
            <div className="text-sm text-gray-500">
              持续时间：{getDuration()}
            </div>
          </div>
        </div>
      </div>

      {/* 地点 */}
      {event.location && (
        <div className="flex items-start gap-2 text-gray-600">
          <span className="text-lg mt-0.5">📍</span>
          <div>
            <div className="font-medium">地点</div>
            <div className="text-gray-900">{event.location}</div>
          </div>
        </div>
      )}

      {/* 描述 */}
      {event.description && (
        <div className="flex items-start gap-2 text-gray-600">
          <span className="text-lg mt-0.5">📝</span>
          <div>
            <div className="font-medium">描述</div>
            <div className="text-gray-900 whitespace-pre-wrap">
              {event.description}
            </div>
          </div>
        </div>
      )}

      {/* 创建信息 */}
      <div className="border-t pt-4 space-y-2 text-sm text-gray-500">
        <div>创建时间：{new Date(event.createdAt).toLocaleString('zh-CN')}</div>
        {event.updatedAt !== event.createdAt && (
          <div>
            更新时间：{new Date(event.updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
        {isCreator && (
          <div className="flex items-center gap-1">
            <span>👤</span>
            <span>由您创建</span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          关闭
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportEvent}
            disabled={exporting || loading}
            size="sm"
          >
            <Download className="h-4 w-4 mr-1" />
            {exporting ? '导出中...' : '导出'}
          </Button>

          {onDuplicate && (
            <Button variant="outline" onClick={onDuplicate} disabled={loading}>
              复制
            </Button>
          )}

          {canEdit && (
            <Button variant="outline" onClick={onEdit} disabled={loading}>
              编辑
            </Button>
          )}

          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('确定要删除这个事件吗？此操作无法撤销。')) {
                  onDelete();
                }
              }}
              disabled={loading}
            >
              {loading ? '删除中...' : '删除'}
            </Button>
          )}
        </div>
      </div>

      {/* 权限提示 */}
      {!canEdit && !canDelete && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>您只有查看权限，无法编辑或删除此事件</span>
          </div>
        </div>
      )}
    </div>
  );
}
