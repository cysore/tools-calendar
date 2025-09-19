/**
 * 个人团队成员管理 API 端点
 * Individual team member management API endpoints
 */

import { NextRequest } from 'next/server';
import { withTeamAuth, withTeamPermission } from '@/lib/team-auth';
import { Permission } from '@/lib/permissions';
import { createSuccessResponse, validateRequestBody } from '@/lib/api-auth';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { UserRole } from '@/types/auth';

interface RouteParams {
  params: {
    teamId: string;
    userId: string;
  };
}

interface UpdateMemberRoleRequest {
  role: UserRole;
}

/**
 * GET /api/teams/[teamId]/members/[userId] - 获取特定成员信息
 * 需要团队成员权限 (所有角色)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取指定成员信息
      const member = await TeamMemberRepository.findByTeamAndUser(
        params.teamId,
        params.userId
      );

      if (!member) {
        throw new Error('MEMBER_NOT_FOUND');
      }

      return createSuccessResponse({
        member,
        canEdit: teamAuth.role === 'owner' || teamAuth.userId === params.userId,
      });
    } catch (error) {
      console.error('获取团队成员信息失败:', error);

      if (error instanceof Error && error.message === 'MEMBER_NOT_FOUND') {
        throw new Error('指定的团队成员不存在');
      }

      throw error;
    }
  })(request);
}

/**
 * PUT /api/teams/[teamId]/members/[userId] - 更新成员角色
 * 需要成员角色管理权限 (仅 Owner)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.UPDATE_MEMBER_ROLES, async req => {
    const { teamAuth } = req;

    try {
      const body = await request.json();

      // 验证请求数据
      const updateData = validateRequestBody<UpdateMemberRoleRequest>(body, [
        'role',
      ]);

      // 检查是否尝试修改自己的角色
      if (teamAuth.userId === params.userId) {
        throw new Error('CANNOT_UPDATE_OWN_ROLE');
      }

      // 获取目标成员当前信息
      const targetMember = await TeamMemberRepository.findByTeamAndUser(
        params.teamId,
        params.userId
      );

      if (!targetMember) {
        throw new Error('MEMBER_NOT_FOUND');
      }

      // 检查是否尝试修改另一个 Owner 的角色
      if (targetMember.role === 'owner' && teamAuth.role !== 'owner') {
        throw new Error('CANNOT_MODIFY_OWNER_ROLE');
      }

      // 更新成员角色
      const updatedMember = await TeamMemberRepository.updateRole(
        params.teamId,
        params.userId,
        updateData.role
      );

      return createSuccessResponse({
        member: updatedMember,
        message: '成员角色更新成功',
      });
    } catch (error) {
      console.error('更新团队成员角色失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'MEMBER_NOT_FOUND':
            throw new Error('指定的团队成员不存在');
          case 'CANNOT_UPDATE_OWN_ROLE':
            throw new Error('不能修改自己的角色');
          case 'CANNOT_MODIFY_OWNER_ROLE':
            throw new Error('不能修改其他所有者的角色');
        }
      }

      throw error;
    }
  })(request);
}

/**
 * DELETE /api/teams/[teamId]/members/[userId] - 移除团队成员
 * 需要成员移除权限 (仅 Owner) 或者是成员自己离开团队
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withTeamAuth(async req => {
    const { teamAuth } = req;

    try {
      // 获取目标成员信息
      const targetMember = await TeamMemberRepository.findByTeamAndUser(
        params.teamId,
        params.userId
      );

      if (!targetMember) {
        throw new Error('MEMBER_NOT_FOUND');
      }

      // 检查权限：Owner 可以移除任何人，成员只能移除自己
      const canRemove =
        teamAuth.role === 'owner' || teamAuth.userId === params.userId;

      if (!canRemove) {
        throw new Error('INSUFFICIENT_PERMISSION');
      }

      // 防止最后一个 Owner 离开团队
      if (targetMember.role === 'owner') {
        const allMembers = await TeamMemberRepository.findByTeam({
          teamId: params.teamId,
        });
        const ownerCount = allMembers.filter(
          member => member.role === 'owner'
        ).length;

        if (ownerCount <= 1) {
          throw new Error('CANNOT_REMOVE_LAST_OWNER');
        }
      }

      // 移除团队成员
      await TeamMemberRepository.remove(params.teamId, params.userId);

      return createSuccessResponse({
        message:
          teamAuth.userId === params.userId ? '成功离开团队' : '成员移除成功',
      });
    } catch (error) {
      console.error('移除团队成员失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'MEMBER_NOT_FOUND':
            throw new Error('指定的团队成员不存在');
          case 'INSUFFICIENT_PERMISSION':
            throw new Error('权限不足，无法移除此成员');
          case 'CANNOT_REMOVE_LAST_OWNER':
            throw new Error('不能移除最后一个团队所有者');
        }
      }

      throw error;
    }
  })(request);
}
