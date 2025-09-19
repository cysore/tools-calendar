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
import {
  withSecurity,
  createSecureResponse,
  createErrorResponse,
} from '@/lib/api-security';
import { InputValidator, AuditLogger } from '@/lib/security';

/**
 * GET /api/teams - 获取用户所属的所有团队
 */
export const GET = withSecurity(
  async (req, { userId }) => {
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    try {
      // 获取用户所属的所有团队
      const teamMembers = await TeamMemberRepository.findByUser({
        userId,
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

      // Log data access
      AuditLogger.logDataAccess('teams', 'read', userId, undefined, req);

      return createSecureResponse({
        teams: teams.filter(Boolean), // 过滤掉可能的null值
      });
    } catch (error) {
      console.error('获取团队列表失败:', error);
      AuditLogger.logSecurityEvent(
        'api_error',
        userId,
        {
          action: 'get_teams',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        req
      );
      return createErrorResponse('Failed to fetch teams', 500);
    }
  },
  {
    requireAuth: true,
    requireCsrf: false, // GET requests don't need CSRF protection
    validateInput: false, // No input to validate for GET
  }
);

/**
 * POST /api/teams - 创建新团队
 */
export const POST = withSecurity(
  async (req, { userId }) => {
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    try {
      const body = await req.json();

      // Enhanced input validation
      if (!body.name || typeof body.name !== 'string') {
        return createErrorResponse('Team name is required', 400);
      }

      // Sanitize and validate input
      const sanitizedName = InputValidator.sanitizeString(body.name, 100);
      if (sanitizedName.length < 2) {
        return createErrorResponse(
          'Team name must be at least 2 characters',
          400
        );
      }

      const sanitizedDescription = body.description
        ? InputValidator.sanitizeString(body.description, 500)
        : undefined;

      // 验证请求数据
      const teamData: CreateTeamData = {
        name: sanitizedName,
        description: sanitizedDescription,
        ownerId: userId,
      };

      // 创建团队
      const team = await TeamRepository.create(teamData);

      // 将创建者添加为团队所有者
      await TeamMemberRepository.create({
        teamId: team.teamId,
        userId,
        role: 'owner',
      });

      // Log team creation
      AuditLogger.logDataAccess('teams', 'create', userId, team.teamId, req);

      return createSecureResponse(
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
      AuditLogger.logSecurityEvent(
        'api_error',
        userId,
        {
          action: 'create_team',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        req
      );
      return createErrorResponse('Failed to create team', 500);
    }
  },
  {
    requireAuth: true,
    requireCsrf: true,
    validateInput: true,
  }
);
