'use client';

import React, { useState } from 'react';
import { CalendarEvent, CreateEventFormData } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EventForm } from './EventForm';
import { EventDetails } from './EventDetails';
import { useTeam } from '@/components/team/TeamProvider';
import { useAuth } from '@/hooks/useAuth';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent;
  initialDate?: Date;
  mode?: 'create' | 'edit' | 'view';
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
}

export function EventModal({
  isOpen,
  onClose,
  event,
  initialDate,
  mode: initialMode = 'create',
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
}: EventModalProps) {
  const { currentTeam, members } = useTeam();
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>(
    event ? (initialMode === 'create' ? 'view' : initialMode) : 'create'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查用户权限
  const canEdit = event
    ? Boolean(
        user?.id === event.createdBy ||
          (currentTeam && ['owner', 'member'].includes(getCurrentUserRole()))
      )
    : true;

  const canDelete = event
    ? Boolean(
        user?.id === event.createdBy ||
          (currentTeam && getCurrentUserRole() === 'owner')
      )
    : false;

  // 获取当前用户在团队中的角色
  function getCurrentUserRole(): string {
    if (!user || !currentTeam) return 'viewer';

    // 首先检查是否是团队所有者
    if (currentTeam.ownerId === user.id) {
      return 'owner';
    }

    // 从团队成员列表中查找当前用户的角色
    const currentMember = members.find(member => member.userId === user.id);
    return currentMember?.role || 'viewer';
  }

  // 处理事件创建
  const handleCreateEvent = async (formData: CreateEventFormData) => {
    if (!currentTeam) {
      setError('请先选择一个团队');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${currentTeam.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '创建事件失败');
      }

      if (data.success && data.data.event) {
        onEventCreated?.(data.data.event);
        onClose();
      }
    } catch (error) {
      console.error('创建事件失败:', error);
      setError(error instanceof Error ? error.message : '创建事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理事件更新
  const handleUpdateEvent = async (formData: CreateEventFormData) => {
    if (!currentTeam || !event) {
      setError('缺少必要信息');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/teams/${currentTeam.id}/events/${event.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '更新事件失败');
      }

      if (data.success && data.data.event) {
        onEventUpdated?.(data.data.event);
        setMode('view');
      }
    } catch (error) {
      console.error('更新事件失败:', error);
      setError(error instanceof Error ? error.message : '更新事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理事件删除
  const handleDeleteEvent = async () => {
    if (!currentTeam || !event) {
      setError('缺少必要信息');
      return;
    }

    if (!confirm('确定要删除这个事件吗？此操作无法撤销。')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/teams/${currentTeam.id}/events/${event.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '删除事件失败');
      }

      if (data.success) {
        onEventDeleted?.(event.id);
        onClose();
      }
    } catch (error) {
      console.error('删除事件失败:', error);
      setError(error instanceof Error ? error.message : '删除事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理模式切换
  const handleEditClick = () => {
    setMode('edit');
    setError(null);
  };

  const handleCancelEdit = () => {
    setMode('view');
    setError(null);
  };

  // 处理事件复制
  const handleDuplicateEvent = () => {
    if (!event) return;

    // 切换到创建模式，使用当前事件的数据作为初始值
    setMode('create');
    setError(null);
  };

  // 处理关闭
  const handleClose = () => {
    setMode(event ? 'view' : 'create');
    setError(null);
    onClose();
  };

  // 获取对话框标题
  const getDialogTitle = (): string => {
    switch (mode) {
      case 'create':
        return '创建事件';
      case 'edit':
        return '编辑事件';
      case 'view':
        return '事件详情';
      default:
        return '事件';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg md:text-xl">
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            {mode === 'create' && '创建新的日历事件'}
            {mode === 'edit' && '编辑现有的日历事件'}
            {mode === 'view' && '查看事件详情和管理选项'}
          </DialogDescription>
        </DialogHeader>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-800">
                <span>⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        {mode === 'create' && (
          <EventForm
            initialDate={initialDate}
            onSubmit={handleCreateEvent}
            onCancel={handleClose}
            loading={loading}
          />
        )}

        {mode === 'edit' && event && (
          <EventForm
            event={event}
            onSubmit={handleUpdateEvent}
            onCancel={handleCancelEdit}
            loading={loading}
          />
        )}

        {mode === 'view' && event && (
          <EventDetails
            event={event}
            onEdit={handleEditClick}
            onDelete={handleDeleteEvent}
            onClose={handleClose}
            onDuplicate={handleDuplicateEvent}
            canEdit={canEdit}
            canDelete={canDelete}
            loading={loading}
          />
        )}

        {mode === 'create' && event && (
          <EventForm
            event={event}
            initialDate={initialDate}
            onSubmit={handleCreateEvent}
            onCancel={handleClose}
            loading={loading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
