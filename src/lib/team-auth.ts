/**
 * 基于团队的角色访问控制中间件
 * Team-based role access control middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@/types/auth';
import { TeamMemberRepository } from './data-access/team-members';
import {
  Permission,
  hasPermission,
  requirePermission,
  PermissionError,
} from './permissions';
import { createErrorResponse, createSuccessResponse } from './api-auth';

export interface TeamAuthContext {
  userId: string;
  email: string;
  teamId: string;
  role: UserRole;
}

export interface TeamAuthenticatedRequest extends NextRequest {
  teamAuth: TeamAuthContext;
}

/**
 * 从请求中提取团队ID
 */
export function extractTeamId(request: NextRequest): string | null {
  const { pathname } = request.nextUrl;

  // 从路径中提取团队ID: /api/teams/[teamId]/...
  const teamIdMatch = pathname.match(/\/api\/teams\/([^\/]+)/);
  if (teamIdMatch) {
    return teamIdMatch[1];
  }

  // 从查询参数中提取团队ID
  const teamId = request.nextUrl.searchParams.get('teamId');
  if (teamId) {
    return teamId;
  }

  // 从请求体中提取团队ID (需要先解析JSON)
  return null;
}

/**
 * 获取用户在团队中的角色
 */
export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<UserRole | null> {
  try {
    const member = await TeamMemberRepository.findByTeamAndUser(teamId, userId);
    return member?.role || null;
  } catch (error) {
    console.error('获取用户团队角色失败:', error);
    return null;
  }
}

/**
 * 验证用户的团队访问权限
 */
export async function authenticateTeamAccess(
  request: NextRequest,
  teamId?: string
): Promise<TeamAuthContext | null> {
  try {
    // 获取用户认证信息
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.userId) {
      return null;
    }

    // 提取团队ID
    const extractedTeamId = teamId || extractTeamId(request);
    if (!extractedTeamId) {
      throw new Error('TEAM_ID_REQUIRED');
    }

    // 获取用户在团队中的角色
    const role = await getUserTeamRole(token.userId, extractedTeamId);
    if (!role) {
      throw new Error('NOT_TEAM_MEMBER');
    }

    return {
      userId: token.userId,
      email: token.email || '',
      teamId: extractedTeamId,
      role,
    };
  } catch (error) {
    console.error('团队访问认证失败:', error);
    return null;
  }
}

/**
 * 要求团队访问权限
 */
export async function requireTeamAccess(
  request: NextRequest,
  teamId?: string
): Promise<TeamAuthContext> {
  const teamAuth = await authenticateTeamAccess(request, teamId);

  if (!teamAuth) {
    throw new Error('TEAM_ACCESS_DENIED');
  }

  return teamAuth;
}

/**
 * 要求团队访问权限和指定权限
 */
export async function requireTeamPermission(
  request: NextRequest,
  permission: Permission,
  teamId?: string
): Promise<TeamAuthContext> {
  const teamAuth = await requireTeamAccess(request, teamId);

  if (!hasPermission(teamAuth.role, permission)) {
    throw new PermissionError(
      `权限不足。需要权限: ${permission}，当前角色: ${teamAuth.role}`,
      permission,
      teamAuth.role
    );
  }

  return teamAuth;
}

/**
 * 团队认证中间件包装器
 */
export function withTeamAuth(
  handler: (request: TeamAuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    teamId?: string;
    extractTeamIdFromBody?: boolean;
  }
) {
  return async (request: NextRequest) => {
    try {
      let teamId = options?.teamId;

      // 如果需要从请求体中提取团队ID
      if (options?.extractTeamIdFromBody && !teamId) {
        try {
          const body = await request.json();
          teamId = body.teamId;

          // 重新创建请求对象，因为body已经被读取
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body),
          });
          request = newRequest;
        } catch (error) {
          console.error('解析请求体失败:', error);
        }
      }

      const teamAuth = await requireTeamAccess(request, teamId);
      const authenticatedRequest = request as TeamAuthenticatedRequest;
      authenticatedRequest.teamAuth = teamAuth;

      return await handler(authenticatedRequest);
    } catch (error) {
      return handleTeamAuthError(error);
    }
  };
}

/**
 * 团队权限中间件包装器
 */
export function withTeamPermission(
  permission: Permission,
  handler: (request: TeamAuthenticatedRequest) => Promise<NextResponse>,
  options?: {
    teamId?: string;
    extractTeamIdFromBody?: boolean;
  }
) {
  return async (request: NextRequest) => {
    try {
      let teamId = options?.teamId;

      // 如果需要从请求体中提取团队ID
      if (options?.extractTeamIdFromBody && !teamId) {
        try {
          const body = await request.json();
          teamId = body.teamId;

          // 重新创建请求对象，因为body已经被读取
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: JSON.stringify(body),
          });
          request = newRequest;
        } catch (error) {
          console.error('解析请求体失败:', error);
        }
      }

      const teamAuth = await requireTeamPermission(request, permission, teamId);
      const authenticatedRequest = request as TeamAuthenticatedRequest;
      authenticatedRequest.teamAuth = teamAuth;

      return await handler(authenticatedRequest);
    } catch (error) {
      return handleTeamAuthError(error);
    }
  };
}

/**
 * 处理团队认证错误
 */
export function handleTeamAuthError(error: unknown): NextResponse {
  if (error instanceof PermissionError) {
    return createErrorResponse('PERMISSION_DENIED', error.message, 403, {
      requiredPermission: error.requiredPermission,
      userRole: error.userRole,
    });
  }

  if (error instanceof Error) {
    switch (error.message) {
      case 'TEAM_ID_REQUIRED':
        return createErrorResponse('VALIDATION_ERROR', '团队ID是必需的', 400);
      case 'NOT_TEAM_MEMBER':
        return createErrorResponse('FORBIDDEN', '您不是此团队的成员', 403);
      case 'TEAM_ACCESS_DENIED':
        return createErrorResponse('UNAUTHORIZED', '团队访问被拒绝', 401);
      default:
        console.error('团队认证错误:', error);
        return createErrorResponse('INTERNAL_ERROR', '内部服务器错误', 500);
    }
  }

  return createErrorResponse('INTERNAL_ERROR', '内部服务器错误', 500);
}

/**
 * 验证事件操作权限的辅助函数
 */
export async function validateEventPermission(
  teamAuth: TeamAuthContext,
  eventCreatedBy: string,
  action: 'edit' | 'delete'
): Promise<boolean> {
  const { role, userId } = teamAuth;

  if (action === 'edit') {
    // Owner 可以编辑所有事件
    if (hasPermission(role, Permission.EDIT_ALL_EVENTS)) {
      return true;
    }

    // Member 可以编辑自己创建的事件
    if (
      hasPermission(role, Permission.EDIT_OWN_EVENTS) &&
      eventCreatedBy === userId
    ) {
      return true;
    }
  }

  if (action === 'delete') {
    // Owner 可以删除所有事件
    if (hasPermission(role, Permission.DELETE_ALL_EVENTS)) {
      return true;
    }

    // Member 可以删除自己创建的事件
    if (
      hasPermission(role, Permission.DELETE_OWN_EVENTS) &&
      eventCreatedBy === userId
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 要求事件操作权限
 */
export async function requireEventPermission(
  teamAuth: TeamAuthContext,
  eventCreatedBy: string,
  action: 'edit' | 'delete'
): Promise<void> {
  const hasPermission = await validateEventPermission(
    teamAuth,
    eventCreatedBy,
    action
  );

  if (!hasPermission) {
    throw new PermissionError(
      `无权限${action === 'edit' ? '编辑' : '删除'}此事件`,
      action === 'edit'
        ? Permission.EDIT_OWN_EVENTS
        : Permission.DELETE_OWN_EVENTS,
      teamAuth.role
    );
  }
}

/**
 * 简单的团队权限检查函数
 */
export async function checkTeamPermission(
  userId: string,
  teamId: string,
  requiredRole: 'owner' | 'member' | 'viewer'
): Promise<boolean> {
  try {
    const userRole = await getUserTeamRole(userId, teamId);
    if (!userRole) return false;

    // Check role hierarchy: owner > member > viewer
    const roleHierarchy = { owner: 3, member: 2, viewer: 1 };
    const userLevel = roleHierarchy[userRole];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Check team permission error:', error);
    return false;
  }
}
