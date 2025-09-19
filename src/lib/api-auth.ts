/**
 * API authentication middleware and utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@/types/auth';
import { hasRole } from './auth-utils';
import { Permission, hasPermission, PermissionError } from './permissions';
import { TeamMemberRepository } from './data-access/team-members';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role?: UserRole;
  };
}

/**
 * API error response helper
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

/**
 * API success response helper
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Authenticate API request
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: { id: string; email: string } } | null> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.userId) {
      return null;
    }

    return {
      user: {
        id: token.userId,
        email: token.email || '',
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Require authentication for API route
 */
export async function requireApiAuth(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth) {
    throw new Error('UNAUTHORIZED');
  }

  return auth;
}

/**
 * Require specific role for API route with team context
 */
export async function requireApiRole(
  request: NextRequest,
  requiredRole: UserRole,
  teamId?: string
) {
  const auth = await requireApiAuth(request);

  if (!teamId) {
    // 如果没有团队ID，从URL路径中提取
    const { pathname } = request.nextUrl;
    const teamIdMatch = pathname.match(/\/api\/teams\/([^\/]+)/);
    if (teamIdMatch) {
      teamId = teamIdMatch[1];
    }
  }

  if (!teamId) {
    throw new Error('TEAM_ID_REQUIRED');
  }

  // 获取用户在团队中的实际角色
  const member = await TeamMemberRepository.findByTeamAndUser(
    teamId,
    auth.user.id
  );
  if (!member) {
    throw new Error('NOT_TEAM_MEMBER');
  }

  if (!hasRole(member.role, requiredRole)) {
    throw new Error('FORBIDDEN');
  }

  return {
    ...auth,
    user: {
      ...auth.user,
      role: member.role,
    },
    teamId,
  };
}

/**
 * Require specific permission for API route
 */
export async function requireApiPermission(
  request: NextRequest,
  permission: Permission,
  teamId?: string
) {
  const auth = await requireApiAuth(request);

  if (!teamId) {
    // 如果没有团队ID，从URL路径中提取
    const { pathname } = request.nextUrl;
    const teamIdMatch = pathname.match(/\/api\/teams\/([^\/]+)/);
    if (teamIdMatch) {
      teamId = teamIdMatch[1];
    }
  }

  if (!teamId) {
    throw new Error('TEAM_ID_REQUIRED');
  }

  // 获取用户在团队中的实际角色
  const member = await TeamMemberRepository.findByTeamAndUser(
    teamId,
    auth.user.id
  );
  if (!member) {
    throw new Error('NOT_TEAM_MEMBER');
  }

  if (!hasPermission(member.role, permission)) {
    throw new PermissionError(
      `权限不足。需要权限: ${permission}，当前角色: ${member.role}`,
      permission,
      member.role
    );
  }

  return {
    ...auth,
    user: {
      ...auth.user,
      role: member.role,
    },
    teamId,
  };
}

/**
 * API route wrapper with authentication
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const auth = await requireApiAuth(request);
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = auth.user;

      return await handler(authenticatedRequest);
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'UNAUTHORIZED':
            return createErrorResponse(
              'UNAUTHORIZED',
              'Authentication required',
              401
            );
          case 'FORBIDDEN':
            return createErrorResponse(
              'FORBIDDEN',
              'Insufficient permissions',
              403
            );
          default:
            console.error('API error:', error);
            return createErrorResponse(
              'INTERNAL_ERROR',
              'Internal server error',
              500
            );
        }
      }

      return createErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      );
    }
  };
}

/**
 * API route wrapper with role-based authentication
 */
export function withRole(
  requiredRole: UserRole,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const auth = await requireApiRole(request, requiredRole);
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = auth.user;

      return await handler(authenticatedRequest);
    } catch (error) {
      return handleApiAuthError(error);
    }
  };
}

/**
 * API route wrapper with permission-based authentication
 */
export function withPermission(
  permission: Permission,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const auth = await requireApiPermission(request, permission);
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = auth.user;

      return await handler(authenticatedRequest);
    } catch (error) {
      return handleApiAuthError(error);
    }
  };
}

/**
 * Handle API authentication errors
 */
export function handleApiAuthError(error: unknown): NextResponse {
  if (error instanceof PermissionError) {
    return createErrorResponse('PERMISSION_DENIED', error.message, 403, {
      requiredPermission: error.requiredPermission,
      userRole: error.userRole,
    });
  }

  if (error instanceof Error) {
    switch (error.message) {
      case 'UNAUTHORIZED':
        return createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required',
          401
        );
      case 'FORBIDDEN':
        return createErrorResponse(
          'FORBIDDEN',
          'Insufficient permissions',
          403
        );
      case 'TEAM_ID_REQUIRED':
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Team ID is required',
          400
        );
      case 'NOT_TEAM_MEMBER':
        return createErrorResponse(
          'FORBIDDEN',
          'You are not a member of this team',
          403
        );
      default:
        console.error('API error:', error);
        return createErrorResponse(
          'INTERNAL_ERROR',
          'Internal server error',
          500
        );
    }
  }

  return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
}

/**
 * Validate request body
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: (keyof T)[]
): T {
  for (const field of requiredFields) {
    if (!body[field]) {
      throw new Error(`Missing required field: ${String(field)}`);
    }
  }

  return body as T;
}
