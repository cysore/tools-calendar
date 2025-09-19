/**
 * 特定团队管理 API 端点
 * Specific team management API endpoints
 */

import { NextRequest } from 'next/server';
import { withTeamAuth, withTeamPermission } from '@/lib/team-auth';
import { Permission } from '@/lib/permissions';
import { createSuccessResponse, validateRequestBody } from '@/lib/api-auth';
import { TeamRepository } from '@/lib/data-access/teams';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { UpdateTeamData } from '@/types/database';

interface RouteParams {
  params: {
    teamId: string;
  };
}

/**
 * GET /api/teams/[teamId] - 获取团队详情
 * 需要团队成员权限
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取团队信息
      const team = await TeamRepository.findById(params.teamId);
      if (!team) {
        throw new Error('TEAM_NOT_FOUND');
      }

      // 获取团队成员列表
      const members = await TeamMemberRepository.findByTeam({
        teamId: params.teamId,
      });

      return createSuccessResponse({
        team: {
          ...team,
          userRole: teamAuth.role,
        },
        members,
      });
    } catch (error) {
      console.error('获取团队详情失败:', error);
      throw error;
    }
  })(request);
}

/**
 * PUT /api/teams/[teamId] - 更新团队信息
 * 需要团队管理权限 (仅 Owner)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.UPDATE_TEAM_SETTINGS, async req => {
    const { teamAuth } = req;

    try {
      const body = await request.json();

      // 验证请求数据
      const updateData = validateRequestBody<UpdateTeamData>(body, []);

      // 更新团队信息
      const updatedTeam = await TeamRepository.update(
        params.teamId,
        updateData
      );

      return createSuccessResponse({
        team: {
          ...updatedTeam,
          userRole: teamAuth.role,
        },
      });
    } catch (error) {
      console.error('更新团队信息失败:', error);
      throw error;
    }
  })(request);
}

/**
 * DELETE /api/teams/[teamId] - 删除团队
 * 需要团队管理权限 (仅 Owner)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.MANAGE_TEAM, async req => {
    const { teamAuth } = req;

    try {
      // 删除所有团队成员
      const members = await TeamMemberRepository.findByTeam({
        teamId: params.teamId,
      });
      await Promise.all(
        members.map(member =>
          TeamMemberRepository.remove(params.teamId, member.userId)
        )
      );

      // 删除团队
      await TeamRepository.delete(params.teamId);

      return createSuccessResponse({
        message: '团队已成功删除',
      });
    } catch (error) {
      console.error('删除团队失败:', error);
      throw error;
    }
  })(request);
}
