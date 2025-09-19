/**
 * 团队管理 API 端点
 * Teams management API endpoints
 */

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api-auth';
import { Permission } from '@/lib/permissions';
import { withPermission } from '@/lib/api-auth';
import { TeamRepository } from '@/lib/data-access/teams';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { CreateTeamData } from '@/types/database';

/**
 * GET /api/teams - 获取用户所属的所有团队
 */
export const GET = withAuth(async request => {
  const { user } = request;

  try {
    // 获取用户所属的所有团队
    const teamMembers = await TeamMemberRepository.findByUser({
      userId: user.id,
    });

    // 获取团队详细信息
    const teams = await Promise.all(
      teamMembers.map(async member => {
        const team = await TeamRepository.findById(member.teamId);
        return {
          ...team,
          userRole: member.role,
          joinedAt: member.joinedAt,
        };
      })
    );

    return createSuccessResponse({
      teams: teams.filter(Boolean), // 过滤掉可能的null值
    });
  } catch (error) {
    console.error('获取团队列表失败:', error);
    throw error;
  }
});

/**
 * POST /api/teams - 创建新团队
 */
export const POST = withAuth(async request => {
  const { user } = request;

  try {
    const body = await request.json();

    // 验证请求数据
    const teamData = validateRequestBody<CreateTeamData>(body, ['name']);

    // 创建团队
    const team = await TeamRepository.create({
      ...teamData,
      ownerId: user.id,
    });

    // 将创建者添加为团队所有者
    await TeamMemberRepository.create({
      teamId: team.teamId,
      userId: user.id,
      role: 'owner',
    });

    return createSuccessResponse(
      {
        team: {
          ...team,
          userRole: 'owner',
        },
      },
      201
    );
  } catch (error) {
    console.error('创建团队失败:', error);
    throw error;
  }
});
