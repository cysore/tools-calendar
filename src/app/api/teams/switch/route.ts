/**
 * 团队切换 API 端点
 * Team switching API endpoint
 */

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api-auth';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { TeamRepository } from '@/lib/data-access/teams';

interface SwitchTeamRequest {
  teamId: string;
}

/**
 * POST /api/teams/switch - 切换当前活跃团队
 * 需要用户认证
 */
export const POST = withAuth(async request => {
  const { user } = request;

  try {
    const body = await request.json();

    // 验证请求数据
    const switchData = validateRequestBody<SwitchTeamRequest>(body, ['teamId']);

    // 验证用户是否是团队成员
    const member = await TeamMemberRepository.findByTeamAndUser(
      switchData.teamId,
      user.id
    );

    if (!member) {
      throw new Error('NOT_TEAM_MEMBER');
    }

    // 获取团队信息
    const team = await TeamRepository.findById(switchData.teamId);
    if (!team) {
      throw new Error('TEAM_NOT_FOUND');
    }

    // 在实际应用中，这里应该更新用户的 lastActiveTeam 字段
    // 由于当前数据模型中没有这个字段，我们只返回切换成功的响应
    // 前端可以将这个信息存储在 localStorage 或 session 中

    return createSuccessResponse({
      currentTeam: {
        id: team.teamId,
        name: team.name,
        description: team.description,
        userRole: member.role,
      },
      message: '团队切换成功',
    });
  } catch (error) {
    console.error('切换团队失败:', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'NOT_TEAM_MEMBER':
          throw new Error('您不是此团队的成员');
        case 'TEAM_NOT_FOUND':
          throw new Error('团队不存在');
      }
    }

    throw error;
  }
});
