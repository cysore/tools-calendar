'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CreateEventFormData, EventCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EventFormProps {
  event?: CalendarEvent;
  initialDate?: Date;
  onSubmit: (data: CreateEventFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// 预设颜色选项
const COLOR_OPTIONS = [
  { value: '#3B82F6', label: '蓝色', name: 'blue' },
  { value: '#10B981', label: '绿色', name: 'green' },
  { value: '#F59E0B', label: '橙色', name: 'orange' },
  { value: '#EF4444', label: '红色', name: 'red' },
  { value: '#8B5CF6', label: '紫色', name: 'purple' },
  { value: '#6B7280', label: '灰色', name: 'gray' },
];

// 分类选项
const CATEGORY_OPTIONS: {
  value: EventCategory;
  label: string;
  icon: string;
}[] = [
  { value: 'meeting', label: '会议', icon: '👥' },
  { value: 'task', label: '任务', icon: '📋' },
  { value: 'reminder', label: '提醒', icon: '⏰' },
];

export function EventForm({
  event,
  initialDate,
  onSubmit,
  onCancel,
  loading = false,
}: EventFormProps) {
  const [formData, setFormData] = useState<CreateEventFormData>(() => {
    if (event) {
      // 编辑模式：使用现有事件数据
      return {
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        location: event.location || '',
        description: event.description || '',
        category: event.category,
        color: event.color,
      };
    } else {
      // 创建模式：使用默认值
      const now = initialDate || new Date();
      const startTime = new Date(now);
      const endTime = new Date(now);
      endTime.setHours(startTime.getHours() + 1);

      return {
        title: '',
        startTime: formatDateTimeLocal(startTime),
        endTime: formatDateTimeLocal(endTime),
        isAllDay: false,
        location: '',
        description: '',
        category: 'meeting' as EventCategory,
        color: COLOR_OPTIONS[0].value,
      };
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 格式化日期时间为 datetime-local 输入格式
  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // 处理表单字段变化
  const handleFieldChange = (field: keyof CreateEventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 处理全天事件切换
  const handleAllDayToggle = (isAllDay: boolean) => {
    setFormData(prev => {
      if (isAllDay) {
        // 切换到全天事件：设置为当天的开始和结束
        const startDate = new Date(prev.startTime);
        const startOfDay = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        return {
          ...prev,
          isAllDay: true,
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        };
      } else {
        // 切换到定时事件：设置默认时间
        const startDate = new Date(prev.startTime);
        const startTime = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          9,
          0
        );
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1);

        return {
          ...prev,
          isAllDay: false,
          startTime: formatDateTimeLocal(startTime),
          endTime: formatDateTimeLocal(endTime),
        };
      }
    });
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 标题验证
    if (!formData.title.trim()) {
      newErrors.title = '请输入事件标题';
    }

    // 时间验证
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);

    if (isNaN(startTime.getTime())) {
      newErrors.startTime = '请选择有效的开始时间';
    }

    if (isNaN(endTime.getTime())) {
      newErrors.endTime = '请选择有效的结束时间';
    }

    if (!formData.isAllDay && startTime >= endTime) {
      newErrors.endTime = '结束时间必须晚于开始时间';
    }

    if (formData.isAllDay) {
      const startDate = startTime.toISOString().split('T')[0];
      const endDate = endTime.toISOString().split('T')[0];
      if (endDate < startDate) {
        newErrors.endTime = '结束日期不能早于开始日期';
      }
    }

    // 检查事件时长是否合理（不超过7天）
    const diffDays = Math.ceil(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 7) {
      newErrors.endTime = '事件时长不能超过7天';
    }

    // 检查是否在过去创建事件（仅对新事件）
    if (!event) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(
        startTime.getFullYear(),
        startTime.getMonth(),
        startTime.getDate()
      );

      if (eventDate < today) {
        newErrors.startTime = '不能在过去的日期创建事件';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('提交事件失败:', error);
      // 错误处理由父组件负责
    }
  };

  // 处理快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-4 md:space-y-6"
    >
      {/* 标题 */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">
          事件标题 *
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={e => handleFieldChange('title', e.target.value)}
          placeholder="输入事件标题"
          className={`text-base md:text-sm h-12 md:h-10 touch-manipulation ${errors.title ? 'border-red-500' : ''}`}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      {/* 全天事件切换 - 移动端优化 */}
      <div className="flex items-center space-x-3 p-3 md:p-0 bg-gray-50 md:bg-transparent rounded-lg md:rounded-none">
        <input
          type="checkbox"
          id="isAllDay"
          checked={formData.isAllDay}
          onChange={e => handleAllDayToggle(e.target.checked)}
          className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-300 touch-manipulation"
        />
        <Label
          htmlFor="isAllDay"
          className="text-base md:text-sm font-medium cursor-pointer"
        >
          全天事件
        </Label>
      </div>

      {/* 时间设置 - 移动端优化 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="startTime"
            className="text-base md:text-sm font-medium"
          >
            {formData.isAllDay ? '开始日期' : '开始时间'} *
          </Label>
          {formData.isAllDay ? (
            <Input
              id="startTime"
              type="date"
              value={formData.startTime.split('T')[0]}
              onChange={e => {
                const date = new Date(e.target.value);
                handleFieldChange('startTime', date.toISOString());
              }}
              className={`text-base md:text-sm h-12 md:h-10 touch-manipulation ${errors.startTime ? 'border-red-500' : ''}`}
            />
          ) : (
            <Input
              id="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={e => handleFieldChange('startTime', e.target.value)}
              className={`text-base md:text-sm h-12 md:h-10 touch-manipulation ${errors.startTime ? 'border-red-500' : ''}`}
            />
          )}
          {errors.startTime && (
            <p className="text-sm text-red-500">{errors.startTime}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime" className="text-base md:text-sm font-medium">
            {formData.isAllDay ? '结束日期' : '结束时间'} *
          </Label>
          {formData.isAllDay ? (
            <Input
              id="endTime"
              type="date"
              value={formData.endTime.split('T')[0]}
              onChange={e => {
                const date = new Date(e.target.value);
                date.setDate(date.getDate() + 1); // 全天事件结束时间为第二天
                handleFieldChange('endTime', date.toISOString());
              }}
              className={`text-base md:text-sm h-12 md:h-10 touch-manipulation ${errors.endTime ? 'border-red-500' : ''}`}
            />
          ) : (
            <Input
              id="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={e => handleFieldChange('endTime', e.target.value)}
              className={`text-base md:text-sm h-12 md:h-10 touch-manipulation ${errors.endTime ? 'border-red-500' : ''}`}
            />
          )}
          {errors.endTime && (
            <p className="text-sm text-red-500">{errors.endTime}</p>
          )}
        </div>
      </div>

      {/* 分类 - 移动端优化 */}
      <div className="space-y-2">
        <Label className="text-base md:text-sm font-medium">事件分类</Label>
        <Select
          value={formData.category}
          onValueChange={(value: EventCategory) =>
            handleFieldChange('category', value)
          }
        >
          <SelectTrigger className="h-12 md:h-10 text-base md:text-sm touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(option => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="py-3 md:py-2"
              >
                <span className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 颜色选择 - 移动端优化 */}
      <div className="space-y-3">
        <Label className="text-base md:text-sm font-medium">事件颜色</Label>
        <div className="flex gap-3 md:gap-2">
          {COLOR_OPTIONS.map(color => (
            <button
              key={color.value}
              type="button"
              onClick={() => handleFieldChange('color', color.value)}
              className={`w-10 h-10 md:w-8 md:h-8 rounded-full border-2 transition-all touch-manipulation ${
                formData.color === color.value
                  ? 'border-gray-900 scale-110 shadow-lg'
                  : 'border-gray-300 hover:border-gray-500 active:scale-95'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      {/* 地点 - 移动端优化 */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-base md:text-sm font-medium">
          地点
        </Label>
        <Input
          id="location"
          value={formData.location}
          onChange={e => handleFieldChange('location', e.target.value)}
          placeholder="输入事件地点"
          className="text-base md:text-sm h-12 md:h-10 touch-manipulation"
        />
      </div>

      {/* 描述 - 移动端优化 */}
      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-base md:text-sm font-medium"
        >
          描述
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => handleFieldChange('description', e.target.value)}
          placeholder="输入事件描述"
          rows={4}
          className="text-base md:text-sm min-h-[100px] md:min-h-[80px] touch-manipulation resize-none"
        />
      </div>

      {/* 操作按钮 - 移动端优化 */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-2 pt-6 md:pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="h-12 md:h-10 text-base md:text-sm touch-manipulation"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 md:h-10 text-base md:text-sm touch-manipulation"
        >
          {loading ? '保存中...' : event ? '更新事件' : '创建事件'}
        </Button>
      </div>
    </form>
  );
}
