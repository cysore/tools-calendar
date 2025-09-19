/**
 * 团队邀请管理 API 端点
 * Team invitations management API endpoints
 */

import { NextRequest } from 'next/server';
import { withTeamPermission } from '@/lib/team-auth';
import { Permission } from '@/lib/permissions';
import { createSuccessResponse, validateRequestBody } from '@/lib/api-auth';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { UserRepository } from '@/lib/data-access/users';
import { TeamRepository } from '@/lib/data-access/teams';
import { UserRole } from '@/types/auth';
import { idUtils } from '@/lib/data-validation';

interface RouteParams {
  params: {
    teamId: string;
  };
}

interface CreateInvitationRequest {
  email: string;
  role: UserRole;
}

/**
 * POST /api/teams/[teamId]/invitations - 创建邀请链接
 * 需要邀请成员权限 (Owner 和 Member)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withTeamPermission(Permission.INVITE_MEMBERS, async req => {
    const { teamAuth } = req;

    try {
      const body = await request.json();

      // 验证请求数据
      const inviteData = validateRequestBody<CreateInvitationRequest>(body, [
        'email',
        'role',
      ]);

      // 验证角色权限：只有 Owner 可以邀请 Owner，Member 只能邀请 Member 或 Viewer
      if (inviteData.role === 'owner' && teamAuth.role !== 'owner') {
        throw new Error('INSUFFICIENT_PERMISSION_FOR_OWNER_ROLE');
      }

      // 查找用户
      const user = await UserRepository.findByEmail(inviteData.email);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // 检查用户是否已经是团队成员
      const existingMember = await TeamMemberRepository.findByTeamAndUser(
        params.teamId,
        user.userId
      );
      if (existingMember) {
        throw new Error('USER_ALREADY_MEMBER');
      }

      // 获取团队信息
      const team = await TeamRepository.findById(params.teamId);
      if (!team) {
        throw new Error('TEAM_NOT_FOUND');
      }

      // 生成邀请令牌
      const invitationToken = idUtils.generateInvitationToken();

      // 构建邀请链接
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const invitationUrl = `${baseUrl}/teams/join?token=${invitationToken}&teamId=${params.teamId}&email=${encodeURIComponent(inviteData.email)}&role=${inviteData.role}`;

      return createSuccessResponse(
        {
          invitationUrl,
          invitationToken,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7天后过期
          teamName: team.name,
          invitedEmail: inviteData.email,
          role: inviteData.role,
          message: '邀请链接创建成功',
        },
        201
      );
    } catch (error) {
      console.error('创建邀请链接失败:', error);

      if (error instanceof Error) {
        switch (error.message) {
          case 'USER_NOT_FOUND':
            throw new Error('指定的用户不存在');
          case 'USER_ALREADY_MEMBER':
            throw new Error('用户已经是团队成员');
          case 'INSUFFICIENT_PERMISSION_FOR_OWNER_ROLE':
            throw new Error('只有团队所有者可以邀请其他所有者');
          case 'TEAM_NOT_FOUND':
            throw new Error('团队不存在');
        }
      }

      throw error;
    }
  })(request);
}
