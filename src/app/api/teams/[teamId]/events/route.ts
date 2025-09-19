/**
 * 团队事件管理 API 端点
 * Team events management API endpoints
 */

import { NextRequest } from 'next/server';
import { withTeamPermission } from '@/lib/team-auth';
import { Permission } from '@/lib/permissions';
import { createSuccessResponse, validateRequestBody } from '@/lib/api-auth';
import { EventRepository } from '@/lib/data-access/events';
import { CreateEventData } from '@/types/database';

interface RouteParams {
  params: {
    teamId: string;
  };
}

/**
 * GET /api/teams/[teamId]/events - 获取团队事件列表
 * 需要查看事件权限 (所有角色)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.VIEW_EVENTS, async req => {
    const { teamAuth } = req;
    const { searchParams } = req.nextUrl;

    try {
      // 获取查询参数
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const category = searchParams.get('category') as
        | 'meeting'
        | 'task'
        | 'reminder'
        | null;
      const createdBy = searchParams.get('createdBy');

      let events;

      // 根据查询参数获取事件
      if (category) {
        // 按分类筛选事件
        events = await EventRepository.findByCategory(params.teamId, category);

        // 如果还有日期范围筛选，进一步过滤
        if (startDate || endDate) {
          events = events.filter(event => {
            const eventDate = new Date(event.startTime)
              .toISOString()
              .split('T')[0];
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
          });
        }
      } else if (createdBy) {
        // 按创建者筛选事件
        events = await EventRepository.findByCreator(params.teamId, createdBy);

        // 如果还有日期范围筛选，进一步过滤
        if (startDate || endDate) {
          events = events.filter(event => {
            const eventDate = new Date(event.startTime)
              .toISOString()
              .split('T')[0];
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
          });
        }
      } else {
        // 获取团队所有事件（可能带日期范围筛选）
        events = await EventRepository.findByTeam({
          teamId: params.teamId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      }

      // 为每个事件添加权限信息
      const eventsWithPermissions = events.map(event => ({
        ...event,
        canEdit:
          teamAuth.role === 'owner' || event.createdBy === teamAuth.userId,
        canDelete:
          teamAuth.role === 'owner' || event.createdBy === teamAuth.userId,
      }));

      return createSuccessResponse({
        events: eventsWithPermissions,
        currentUserRole: teamAuth.role,
        filters: {
          startDate,
          endDate,
          category,
          createdBy,
        },
        totalCount: eventsWithPermissions.length,
      });
    } catch (error) {
      console.error('获取团队事件列表失败:', error);
      throw error;
    }
  })(request);
}

/**
 * POST /api/teams/[teamId]/events - 创建新事件
 * 需要创建事件权限 (Owner 和 Member)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.CREATE_EVENTS, async req => {
    const { teamAuth } = req;

    try {
      const body = await request.json();

      // 验证请求数据
      const eventData = validateRequestBody<
        Omit<CreateEventData, 'teamId' | 'createdBy'>
      >(body, [
        'title',
        'startTime',
        'endTime',
        'isAllDay',
        'category',
        'color',
      ]);

      // 验证时间格式和逻辑
      const startTime = new Date(eventData.startTime);
      const endTime = new Date(eventData.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new Error('INVALID_DATE_FORMAT');
      }

      if (startTime >= endTime && !eventData.isAllDay) {
        throw new Error('INVALID_TIME_RANGE');
      }

      // 对于全天事件，确保开始和结束是同一天或结束日期晚于开始日期
      if (eventData.isAllDay) {
        const startDate = startTime.toISOString().split('T')[0];
        const endDate = endTime.toISOString().split('T')[0];

        if (endDate < startDate) {
          throw new Error('INVALID_DATE_RANGE');
        }
      }

      // 验证事件不能创建在过去（可选的业务逻辑）
      const now = new Date();
      if (startTime < now && !eventData.isAllDay) {
        // 允许在当天创建事件，但不能在过去的日期
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const eventDate = new Date(
          startTime.getFullYear(),
          startTime.getMonth(),
          startTime.getDate()
        );

        if (eventDate < today) {
          throw new Error('PAST_DATE_NOT_ALLOWED');
        }
      }

      // 创建事件
      const newEvent = await EventRepository.create({
        ...eventData,
        teamId: params.teamId,
        createdBy: teamAuth.userId,
      });

      return createSuccessResponse(
        {
          event: {
            ...newEvent,
            canEdit: true,
            canDelete: true,
          },
          message: '事件创建成功',
        },
        201
      );
    } catch (error) {
      console.error('创建团队事件失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'INVALID_DATE_FORMAT':
            throw new Error('无效的日期时间格式');
          case 'INVALID_TIME_RANGE':
            throw new Error('结束时间必须晚于开始时间');
          case 'INVALID_DATE_RANGE':
            throw new Error('全天事件的结束日期不能早于开始日期');
          case 'PAST_DATE_NOT_ALLOWED':
            throw new Error('不能在过去的日期创建事件');
        }
      }

      throw error;
    }
  })(request);
}
