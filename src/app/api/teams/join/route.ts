/**
 * Team join API endpoint for handling invitation links
 */

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api-auth';
import { TeamRepository } from '@/lib/data-access/teams';
import { TeamMemberRepository } from '@/lib/data-access/team-members';
import { UserRepository } from '@/lib/data-access/users';
import { UserRole } from '@/types/auth';

interface JoinTeamRequest {
  token: string;
  teamId: string;
  email: string;
  role: UserRole;
}

/**
 * POST /api/teams/join - 通过邀请链接加入团队
 */
export const POST = withAuth(async request => {
  const { user } = request;

  try {
    const body = await request.json();

    // 验证请求数据
    const joinData = validateRequestBody<JoinTeamRequest>(body, [
      'token',
      'teamId',
      'email',
      'role',
    ]);

    // 验证邮箱是否匹配当前用户
    if (user.email !== joinData.email) {
      throw new Error('INVALID_EMAIL_MATCH');
    }

    // 验证团队是否存在
    const team = await TeamRepository.findById(joinData.teamId);
    if (!team) {
      throw new Error('TEAM_NOT_FOUND');
    }

    // 检查用户是否已经是团队成员
    const existingMember = await TeamMemberRepository.findByTeamAndUser(
      joinData.teamId,
      user.id
    );
    if (existingMember) {
      throw new Error('USER_ALREADY_MEMBER');
    }

    // 在实际应用中，这里应该验证邀请令牌的有效性
    // 目前简化处理，直接添加用户到团队
    // TODO: 实现邀请令牌的存储和验证机制

    // 添加用户到团队
    const newMember = await TeamMemberRepository.create({
      teamId: joinData.teamId,
      userId: user.id,
      role: joinData.role,
    });

    // 获取用户信息
    const userInfo = await UserRepository.findById(user.id);

    return createSuccessResponse(
      {
        member: {
          ...newMember,
          user: userInfo
            ? {
                id: userInfo.userId,
                name: userInfo.name,
                email: userInfo.email,
              }
            : null,
        },
        team: {
          id: team.teamId,
          name: team.name,
          description: team.description,
        },
        message: '成功加入团队',
      },
      201
    );
  } catch (error) {
    console.error('加入团队失败:', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'INVALID_EMAIL_MATCH':
          throw new Error('此邀请链接不是为您的邮箱地址创建的');
        case 'TEAM_NOT_FOUND':
          throw new Error('团队不存在');
        case 'USER_ALREADY_MEMBER':
          throw new Error('您已经是该团队的成员');
        case 'INVALID_INVITATION_TOKEN':
          throw new Error('邀请链接无效或已过期');
      }
    }

    throw error;
  }
});
