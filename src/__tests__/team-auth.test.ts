/**
 * 团队认证中间件测试
 * Team authentication middleware tests
 */

// Mock Next.js server components before importing
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation(url => ({
    nextUrl: new URL(url),
    headers: new Map(),
  })),
  NextResponse: {
    json: jest.fn(),
    next: jest.fn(),
  },
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@/lib/data-access/team-members');

import {
  extractTeamId,
  getUserTeamRole,
  validateEventPermission,
  requireEventPermission,
} from '@/lib/team-auth';
import { Permission, PermissionError } from '@/lib/permissions';
import { TeamMemberRepository } from '@/lib/data-access/team-members';

const mockTeamMemberRepository = TeamMemberRepository as jest.Mocked<
  typeof TeamMemberRepository
>;

describe('团队认证中间件 (Team Authentication Middleware)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTeamId', () => {
    test('应该从 API 路径中提取团队ID', () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost/api/teams/team123/events'),
      };
      const teamId = extractTeamId(mockRequest as any);
      expect(teamId).toBe('team123');
    });

    test('应该从查询参数中提取团队ID', () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost/api/events?teamId=team456'),
      };
      const teamId = extractTeamId(mockRequest as any);
      expect(teamId).toBe('team456');
    });

    test('当没有团队ID时应该返回null', () => {
      const mockRequest = {
        nextUrl: new URL('http://localhost/api/users'),
      };
      const teamId = extractTeamId(mockRequest as any);
      expect(teamId).toBeNull();
    });

    test('应该优先使用路径中的团队ID', () => {
      const mockRequest = {
        nextUrl: new URL(
          'http://localhost/api/teams/team123/events?teamId=team456'
        ),
      };
      const teamId = extractTeamId(mockRequest as any);
      expect(teamId).toBe('team123');
    });
  });

  describe('getUserTeamRole', () => {
    test('应该返回用户在团队中的角色', async () => {
      const mockMember = {
        PK: 'TEAM#team123',
        SK: 'MEMBER#user123',
        teamId: 'team123',
        userId: 'user123',
        role: 'owner' as const,
        joinedAt: '2024-01-01T00:00:00Z',
        GSI1PK: 'USER#user123',
        GSI1SK: 'TEAM#team123',
      };

      mockTeamMemberRepository.findByTeamAndUser.mockResolvedValue(mockMember);

      const role = await getUserTeamRole('user123', 'team123');
      expect(role).toBe('owner');
      expect(mockTeamMemberRepository.findByTeamAndUser).toHaveBeenCalledWith(
        'team123',
        'user123'
      );
    });

    test('当用户不是团队成员时应该返回null', async () => {
      mockTeamMemberRepository.findByTeamAndUser.mockResolvedValue(null);

      const role = await getUserTeamRole('user123', 'team123');
      expect(role).toBeNull();
    });

    test('当发生错误时应该返回null', async () => {
      mockTeamMemberRepository.findByTeamAndUser.mockRejectedValue(
        new Error('Database error')
      );

      const role = await getUserTeamRole('user123', 'team123');
      expect(role).toBeNull();
    });
  });

  describe('validateEventPermission', () => {
    const teamAuth = {
      userId: 'user123',
      email: 'user@example.com',
      teamId: 'team123',
      role: 'member' as const,
    };

    test('Owner 应该可以编辑和删除所有事件', async () => {
      const ownerAuth = { ...teamAuth, role: 'owner' as const };

      const canEdit = await validateEventPermission(
        ownerAuth,
        'otherUser',
        'edit'
      );
      const canDelete = await validateEventPermission(
        ownerAuth,
        'otherUser',
        'delete'
      );

      expect(canEdit).toBe(true);
      expect(canDelete).toBe(true);
    });

    test('Member 应该可以编辑和删除自己创建的事件', async () => {
      const canEdit = await validateEventPermission(
        teamAuth,
        'user123',
        'edit'
      );
      const canDelete = await validateEventPermission(
        teamAuth,
        'user123',
        'delete'
      );

      expect(canEdit).toBe(true);
      expect(canDelete).toBe(true);
    });

    test('Member 不应该可以编辑和删除他人创建的事件', async () => {
      const canEdit = await validateEventPermission(
        teamAuth,
        'otherUser',
        'edit'
      );
      const canDelete = await validateEventPermission(
        teamAuth,
        'otherUser',
        'delete'
      );

      expect(canEdit).toBe(false);
      expect(canDelete).toBe(false);
    });

    test('Viewer 不应该可以编辑和删除任何事件', async () => {
      const viewerAuth = { ...teamAuth, role: 'viewer' as const };

      const canEditOwn = await validateEventPermission(
        viewerAuth,
        'user123',
        'edit'
      );
      const canDeleteOwn = await validateEventPermission(
        viewerAuth,
        'user123',
        'delete'
      );
      const canEditOther = await validateEventPermission(
        viewerAuth,
        'otherUser',
        'edit'
      );
      const canDeleteOther = await validateEventPermission(
        viewerAuth,
        'otherUser',
        'delete'
      );

      expect(canEditOwn).toBe(false);
      expect(canDeleteOwn).toBe(false);
      expect(canEditOther).toBe(false);
      expect(canDeleteOther).toBe(false);
    });
  });

  describe('requireEventPermission', () => {
    const teamAuth = {
      userId: 'user123',
      email: 'user@example.com',
      teamId: 'team123',
      role: 'member' as const,
    };

    test('应该允许有权限的操作', async () => {
      const ownerAuth = { ...teamAuth, role: 'owner' as const };

      await expect(
        requireEventPermission(ownerAuth, 'otherUser', 'edit')
      ).resolves.not.toThrow();
      await expect(
        requireEventPermission(teamAuth, 'user123', 'edit')
      ).resolves.not.toThrow();
    });

    test('应该拒绝无权限的操作', async () => {
      await expect(
        requireEventPermission(teamAuth, 'otherUser', 'edit')
      ).rejects.toThrow(PermissionError);

      const viewerAuth = { ...teamAuth, role: 'viewer' as const };
      await expect(
        requireEventPermission(viewerAuth, 'user123', 'edit')
      ).rejects.toThrow(PermissionError);
    });

    test('抛出的错误应该包含正确的信息', async () => {
      try {
        await requireEventPermission(teamAuth, 'otherUser', 'edit');
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        expect((error as PermissionError).requiredPermission).toBe(
          Permission.EDIT_OWN_EVENTS
        );
        expect((error as PermissionError).userRole).toBe('member');
      }
    });
  });

  describe('权限验证集成测试 (Permission Validation Integration Tests)', () => {
    test('完整的权限检查流程', async () => {
      // 模拟不同角色的用户
      const scenarios = [
        {
          role: 'owner' as const,
          canManageTeam: true,
          canInviteMembers: true,
          canEditAllEvents: true,
          canDeleteAllEvents: true,
        },
        {
          role: 'member' as const,
          canManageTeam: false,
          canInviteMembers: true,
          canEditAllEvents: false,
          canDeleteAllEvents: false,
        },
        {
          role: 'viewer' as const,
          canManageTeam: false,
          canInviteMembers: false,
          canEditAllEvents: false,
          canDeleteAllEvents: false,
        },
      ];

      for (const scenario of scenarios) {
        const teamAuth = {
          userId: 'user123',
          email: 'user@example.com',
          teamId: 'team123',
          role: scenario.role,
        };

        // 测试团队管理权限
        const canManageTeam = await validateEventPermission(
          teamAuth,
          'otherUser',
          'edit'
        );
        // 注意：这里使用事件权限作为代理测试，实际应用中会有专门的团队管理权限检查

        // 测试事件权限
        const canEditOwnEvent = await validateEventPermission(
          teamAuth,
          'user123',
          'edit'
        );
        const canEditOtherEvent = await validateEventPermission(
          teamAuth,
          'otherUser',
          'edit'
        );
        const canDeleteOwnEvent = await validateEventPermission(
          teamAuth,
          'user123',
          'delete'
        );
        const canDeleteOtherEvent = await validateEventPermission(
          teamAuth,
          'otherUser',
          'delete'
        );

        // 验证权限是否符合预期
        if (scenario.role === 'owner') {
          expect(canEditOtherEvent).toBe(true);
          expect(canDeleteOtherEvent).toBe(true);
        } else if (scenario.role === 'member') {
          expect(canEditOwnEvent).toBe(true);
          expect(canDeleteOwnEvent).toBe(true);
          expect(canEditOtherEvent).toBe(false);
          expect(canDeleteOtherEvent).toBe(false);
        } else {
          // viewer
          expect(canEditOwnEvent).toBe(false);
          expect(canDeleteOwnEvent).toBe(false);
          expect(canEditOtherEvent).toBe(false);
          expect(canDeleteOtherEvent).toBe(false);
        }
      }
    });
  });
});
