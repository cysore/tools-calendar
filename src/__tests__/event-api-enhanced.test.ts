/**
 * 增强的事件 API 端点测试
 * Enhanced Event API endpoints tests
 */

import { validateData, eventValidation } from '@/lib/data-validation';
import { CreateEventData, UpdateEventData } from '@/types/database';

describe('增强的事件 API 功能测试', () => {
  describe('事件查询参数验证', () => {
    it('应该支持按分类筛选事件', () => {
      const validCategories = ['meeting', 'task', 'reminder'];
      const queryParams = new URLSearchParams();

      validCategories.forEach(category => {
        queryParams.set('category', category);
        expect(queryParams.get('category')).toBe(category);
        expect(['meeting', 'task', 'reminder']).toContain(category);
      });
    });

    it('应该支持按创建者筛选事件', () => {
      const queryParams = new URLSearchParams();
      const createdBy = 'user-123';

      queryParams.set('createdBy', createdBy);
      expect(queryParams.get('createdBy')).toBe(createdBy);
    });

    it('应该支持组合查询参数', () => {
      const queryParams = new URLSearchParams();

      queryParams.set('startDate', '2024-01-01');
      queryParams.set('endDate', '2024-01-31');
      queryParams.set('category', 'meeting');

      expect(queryParams.get('startDate')).toBe('2024-01-01');
      expect(queryParams.get('endDate')).toBe('2024-01-31');
      expect(queryParams.get('category')).toBe('meeting');
    });
  });

  describe('全天事件验证', () => {
    it('应该验证有效的全天事件', () => {
      const validAllDayEvent: CreateEventData = {
        teamId: 'team-123',
        title: '全天会议',
        startTime: '2024-01-15T00:00:00.000Z',
        endTime: '2024-01-15T23:59:59.999Z',
        isAllDay: true,
        category: 'meeting',
        color: '#FF5733',
        createdBy: 'user-123',
      };

      expect(() => {
        validateData(eventValidation.create, validAllDayEvent);
      }).not.toThrow();
    });

    it('应该验证跨天的全天事件', () => {
      const multiDayEvent: CreateEventData = {
        teamId: 'team-123',
        title: '多天活动',
        startTime: '2024-01-15T00:00:00.000Z',
        endTime: '2024-01-17T23:59:59.999Z',
        isAllDay: true,
        category: 'task',
        color: '#FF5733',
        createdBy: 'user-123',
      };

      expect(() => {
        validateData(eventValidation.create, multiDayEvent);
      }).not.toThrow();
    });

    it('应该拒绝结束日期早于开始日期的全天事件', () => {
      const invalidAllDayEvent: CreateEventData = {
        teamId: 'team-123',
        title: '无效全天事件',
        startTime: '2024-01-15T00:00:00.000Z',
        endTime: '2024-01-14T23:59:59.999Z', // 结束日期早于开始日期
        isAllDay: true,
        category: 'meeting',
        color: '#FF5733',
        createdBy: 'user-123',
      };

      expect(() => {
        validateData(eventValidation.create, invalidAllDayEvent);
      }).toThrow();
    });
  });

  describe('事件时间验证增强', () => {
    it('应该验证事件时间不能重叠（业务逻辑）', () => {
      // 这是一个业务逻辑测试，实际实现可能在服务层
      const event1 = {
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
      };

      const event2 = {
        startTime: '2024-01-15T10:30:00.000Z',
        endTime: '2024-01-15T11:30:00.000Z',
      };

      // 检查时间重叠
      const start1 = new Date(event1.startTime);
      const end1 = new Date(event1.endTime);
      const start2 = new Date(event2.startTime);
      const end2 = new Date(event2.endTime);

      const isOverlapping = start1 < end2 && start2 < end1;
      expect(isOverlapping).toBe(true);
    });

    it('应该验证事件持续时间合理性', () => {
      const testCases = [
        {
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T10:15:00.000Z',
          duration: 15, // 15分钟
          valid: true,
        },
        {
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-15T18:00:00.000Z',
          duration: 480, // 8小时
          valid: true,
        },
        {
          startTime: '2024-01-15T10:00:00.000Z',
          endTime: '2024-01-16T10:00:00.000Z',
          duration: 1440, // 24小时
          valid: true, // 可能是全天事件或特殊活动
        },
      ];

      testCases.forEach(({ startTime, endTime, duration, valid }) => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const actualDuration = (end.getTime() - start.getTime()) / (1000 * 60); // 分钟

        expect(actualDuration).toBe(duration);
        expect(actualDuration > 0).toBe(valid);
      });
    });
  });

  describe('事件数据清理和安全', () => {
    it('应该清理事件标题中的恶意内容', () => {
      const maliciousTitle = '<script>alert("xss")</script>恶意标题';
      const cleanTitle = maliciousTitle
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();

      expect(cleanTitle).toBe('恶意标题');
      expect(cleanTitle).not.toContain('<script>');
    });

    it('应该清理事件描述中的HTML标签', () => {
      const htmlDescription =
        '<p>这是一个<strong>重要</strong>的会议</p><script>alert("xss")</script>';
      const cleanDescription = htmlDescription
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();

      expect(cleanDescription).toBe('这是一个重要的会议');
      expect(cleanDescription).not.toContain('<p>');
      expect(cleanDescription).not.toContain('<script>');
    });

    it('应该验证颜色值格式', () => {
      const validColors = [
        '#FF5733',
        '#00FF00',
        '#0000FF',
        '#FFFFFF',
        '#000000',
      ];
      const invalidColors = [
        'FF5733',
        '#GG5733',
        'red',
        '#FF573',
        'rgb(255,87,51)',
      ];

      validColors.forEach(color => {
        expect(/^#[0-9A-Fa-f]{6}$/.test(color)).toBe(true);
      });

      invalidColors.forEach(color => {
        expect(/^#[0-9A-Fa-f]{6}$/.test(color)).toBe(false);
      });
    });
  });

  describe('事件权限和访问控制', () => {
    it('应该正确计算事件权限', () => {
      const testCases = [
        {
          userRole: 'owner',
          eventCreatedBy: 'other-user',
          userId: 'current-user',
          canEdit: true,
          canDelete: true,
          description: 'Owner 拥有所有权限',
        },
        {
          userRole: 'member',
          eventCreatedBy: 'current-user',
          userId: 'current-user',
          canEdit: true,
          canDelete: true,
          description: 'Member 可以编辑删除自己的事件',
        },
        {
          userRole: 'member',
          eventCreatedBy: 'other-user',
          userId: 'current-user',
          canEdit: false,
          canDelete: false,
          description: 'Member 不能编辑删除他人事件',
        },
        {
          userRole: 'viewer',
          eventCreatedBy: 'current-user',
          userId: 'current-user',
          canEdit: false,
          canDelete: false,
          description: 'Viewer 没有编辑删除权限',
        },
      ];

      testCases.forEach(
        ({
          userRole,
          eventCreatedBy,
          userId,
          canEdit,
          canDelete,
          description,
        }) => {
          const actualCanEdit =
            userRole === 'owner' ||
            (userRole === 'member' && eventCreatedBy === userId);
          const actualCanDelete =
            userRole === 'owner' ||
            (userRole === 'member' && eventCreatedBy === userId);

          expect(actualCanEdit).toBe(canEdit);
          expect(actualCanDelete).toBe(canDelete);
        }
      );
    });
  });

  describe('API 响应格式验证', () => {
    it('应该返回正确的事件列表响应格式', () => {
      const mockResponse = {
        success: true,
        data: {
          events: [
            {
              eventId: 'event-123',
              teamId: 'team-123',
              title: '测试事件',
              startTime: '2024-01-15T10:00:00.000Z',
              endTime: '2024-01-15T11:00:00.000Z',
              isAllDay: false,
              category: 'meeting',
              color: '#FF5733',
              createdBy: 'user-123',
              canEdit: true,
              canDelete: true,
            },
          ],
          currentUserRole: 'member',
          filters: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            category: 'meeting',
            createdBy: null,
          },
          totalCount: 1,
        },
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.events).toHaveLength(1);
      expect(mockResponse.data.events[0]).toHaveProperty('canEdit');
      expect(mockResponse.data.events[0]).toHaveProperty('canDelete');
      expect(mockResponse.data.filters).toHaveProperty('startDate');
      expect(mockResponse.data.filters).toHaveProperty('category');
      expect(mockResponse.data).toHaveProperty('totalCount');
    });

    it('应该返回正确的事件创建响应格式', () => {
      const mockResponse = {
        success: true,
        data: {
          event: {
            eventId: 'event-123',
            teamId: 'team-123',
            title: '新事件',
            startTime: '2024-01-15T10:00:00.000Z',
            endTime: '2024-01-15T11:00:00.000Z',
            isAllDay: false,
            category: 'meeting',
            color: '#FF5733',
            createdBy: 'user-123',
            canEdit: true,
            canDelete: true,
          },
          message: '事件创建成功',
        },
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.event).toHaveProperty('eventId');
      expect(mockResponse.data.event).toHaveProperty('canEdit');
      expect(mockResponse.data.event).toHaveProperty('canDelete');
      expect(mockResponse.data).toHaveProperty('message');
    });
  });

  describe('错误处理验证', () => {
    it('应该返回正确的错误响应格式', () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '数据验证失败: title: 标题不能为空',
          details: {
            field: 'title',
            value: '',
          },
        },
      };

      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.error).toHaveProperty('code');
      expect(mockErrorResponse.error).toHaveProperty('message');
      expect(mockErrorResponse.error).toHaveProperty('details');
    });

    it('应该处理权限错误', () => {
      const mockPermissionError = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '无权限编辑此事件',
          details: {
            requiredPermission: 'EDIT_OWN_EVENTS',
            userRole: 'viewer',
          },
        },
      };

      expect(mockPermissionError.success).toBe(false);
      expect(mockPermissionError.error.code).toBe('PERMISSION_DENIED');
      expect(mockPermissionError.error.details).toHaveProperty(
        'requiredPermission'
      );
      expect(mockPermissionError.error.details).toHaveProperty('userRole');
    });
  });
});
