/**
 * 个人事件管理 API 端点
 * Individual event management API endpoints
 */

import { NextRequest } from 'next/server';
import { withTeamAuth, requireEventPermission } from '@/lib/team-auth';
import { createSuccessResponse, validateRequestBody } from '@/lib/api-auth';
import { EventRepository } from '@/lib/data-access/events';
import { UpdateEventData } from '@/types/database';

interface RouteParams {
  params: {
    teamId: string;
    eventId: string;
  };
}

/**
 * GET /api/teams/[teamId]/events/[eventId] - 获取特定事件详情
 * 需要查看事件权限 (所有角色)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取事件信息
      const event = await EventRepository.findById(
        params.teamId,
        params.eventId
      );

      if (!event || event.teamId !== params.teamId) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // 检查查看权限
      if (!teamAuth || event.teamId !== teamAuth.teamId) {
        throw new Error('ACCESS_DENIED');
      }

      return createSuccessResponse({
        event: {
          ...event,
          canEdit:
            teamAuth.role === 'owner' || event.createdBy === teamAuth.userId,
          canDelete:
            teamAuth.role === 'owner' || event.createdBy === teamAuth.userId,
        },
      });
    } catch (error) {
      console.error('获取事件详情失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'EVENT_NOT_FOUND':
            throw new Error('指定的事件不存在');
          case 'ACCESS_DENIED':
            throw new Error('无权限访问此事件');
        }
      }

      throw error;
    }
  })(request);
}

/**
 * PUT /api/teams/[teamId]/events/[eventId] - 更新事件
 * 需要编辑事件权限 (Owner 或事件创建者)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取现有事件信息
      const existingEvent = await EventRepository.findById(
        params.teamId,
        params.eventId
      );

      if (!existingEvent || existingEvent.teamId !== params.teamId) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // 检查编辑权限
      await requireEventPermission(teamAuth, existingEvent.createdBy, 'edit');

      const body = await request.json();

      // 验证请求数据
      const updateData = validateRequestBody<UpdateEventData>(body, []);

      // 验证时间格式和逻辑（如果提供了时间）
      if (
        updateData.startTime ||
        updateData.endTime ||
        updateData.isAllDay !== undefined
      ) {
        const startTime = new Date(
          updateData.startTime || existingEvent.startTime
        );
        const endTime = new Date(updateData.endTime || existingEvent.endTime);
        const isAllDay =
          updateData.isAllDay !== undefined
            ? updateData.isAllDay
            : existingEvent.isAllDay;

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error('INVALID_DATE_FORMAT');
        }

        if (startTime >= endTime && !isAllDay) {
          throw new Error('INVALID_TIME_RANGE');
        }

        // 对于全天事件，验证日期范围
        if (isAllDay) {
          const startDate = startTime.toISOString().split('T')[0];
          const endDate = endTime.toISOString().split('T')[0];

          if (endDate < startDate) {
            throw new Error('INVALID_DATE_RANGE');
          }
        }
      }

      // 更新事件
      const updatedEvent = await EventRepository.update(
        params.teamId,
        params.eventId,
        updateData
      );

      return createSuccessResponse({
        event: {
          ...updatedEvent,
          canEdit: true,
          canDelete:
            teamAuth.role === 'owner' ||
            updatedEvent.createdBy === teamAuth.userId,
        },
        message: '事件更新成功',
      });
    } catch (error) {
      console.error('更新事件失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'EVENT_NOT_FOUND':
            throw new Error('指定的事件不存在');
          case 'INVALID_DATE_FORMAT':
            throw new Error('无效的日期时间格式');
          case 'INVALID_TIME_RANGE':
            throw new Error('结束时间必须晚于开始时间');
          case 'INVALID_DATE_RANGE':
            throw new Error('全天事件的结束日期不能早于开始日期');
        }
      }

      throw error;
    }
  })(request);
}

/**
 * DELETE /api/teams/[teamId]/events/[eventId] - 删除事件
 * 需要删除事件权限 (Owner 或事件创建者)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取现有事件信息
      const existingEvent = await EventRepository.findById(
        params.teamId,
        params.eventId
      );

      if (!existingEvent || existingEvent.teamId !== params.teamId) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // 检查删除权限
      await requireEventPermission(teamAuth, existingEvent.createdBy, 'delete');

      // 删除事件
      await EventRepository.delete(params.teamId, params.eventId);

      return createSuccessResponse({
        message: '事件删除成功',
      });
    } catch (error) {
      console.error('删除事件失败:', error);

      if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
        throw new Error('指定的事件不存在');
      }

      throw error;
    }
  })(request);
}
