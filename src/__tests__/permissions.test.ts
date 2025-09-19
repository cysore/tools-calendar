/**
 * 权限系统测试
 * Permissions system tests
 */

import {
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  canEditEvent,
  canDeleteEvent,
  canManageMembers,
  canInviteMembers,
  canManageTeamSettings,
  canManageSubscriptions,
  getUserPermissions,
  PermissionError,
  requirePermission,
  requireEventEditPermission,
  requireEventDeletePermission,
} from '@/lib/permissions';
import { UserRole } from '@/types/auth';

describe('权限系统 (Permissions System)', () => {
  describe('角色权限映射 (Role Permissions Mapping)', () => {
    test('Owner 应该拥有所有权限', () => {
      const ownerPermissions = ROLE_PERMISSIONS.owner;

      // 检查 Owner 是否拥有所有权限
      expect(ownerPermissions).toContain(Permission.MANAGE_TEAM);
      expect(ownerPermissions).toContain(Permission.INVITE_MEMBERS);
      expect(ownerPermissions).toContain(Permission.REMOVE_MEMBERS);
      expect(ownerPermissions).toContain(Permission.UPDATE_MEMBER_ROLES);
      expect(ownerPermissions).toContain(Permission.CREATE_EVENTS);
      expect(ownerPermissions).toContain(Permission.EDIT_ALL_EVENTS);
      expect(ownerPermissions).toContain(Permission.DELETE_ALL_EVENTS);
      expect(ownerPermissions).toContain(Permission.MANAGE_SUBSCRIPTIONS);
      expect(ownerPermissions).toContain(Permission.UPDATE_TEAM_SETTINGS);
    });

    test('Member 应该拥有有限权限', () => {
      const memberPermissions = ROLE_PERMISSIONS.member;

      // Member 应该有的权限
      expect(memberPermissions).toContain(Permission.INVITE_MEMBERS);
      expect(memberPermissions).toContain(Permission.CREATE_EVENTS);
      expect(memberPermissions).toContain(Permission.EDIT_OWN_EVENTS);
      expect(memberPermissions).toContain(Permission.DELETE_OWN_EVENTS);
      expect(memberPermissions).toContain(Permission.VIEW_EVENTS);
      expect(memberPermissions).toContain(Permission.VIEW_SUBSCRIPTIONS);
      expect(memberPermissions).toContain(Permission.VIEW_TEAM_SETTINGS);

      // Member 不应该有的权限
      expect(memberPermissions).not.toContain(Permission.MANAGE_TEAM);
      expect(memberPermissions).not.toContain(Permission.REMOVE_MEMBERS);
      expect(memberPermissions).not.toContain(Permission.UPDATE_MEMBER_ROLES);
      expect(memberPermissions).not.toContain(Permission.EDIT_ALL_EVENTS);
      expect(memberPermissions).not.toContain(Permission.DELETE_ALL_EVENTS);
      expect(memberPermissions).not.toContain(Permission.MANAGE_SUBSCRIPTIONS);
      expect(memberPermissions).not.toContain(Permission.UPDATE_TEAM_SETTINGS);
    });

    test('Viewer 应该只有查看权限', () => {
      const viewerPermissions = ROLE_PERMISSIONS.viewer;

      // Viewer 应该有的权限
      expect(viewerPermissions).toContain(Permission.VIEW_EVENTS);
      expect(viewerPermissions).toContain(Permission.VIEW_SUBSCRIPTIONS);
      expect(viewerPermissions).toContain(Permission.VIEW_TEAM_SETTINGS);

      // Viewer 不应该有的权限
      expect(viewerPermissions).not.toContain(Permission.CREATE_EVENTS);
      expect(viewerPermissions).not.toContain(Permission.EDIT_OWN_EVENTS);
      expect(viewerPermissions).not.toContain(Permission.DELETE_OWN_EVENTS);
      expect(viewerPermissions).not.toContain(Permission.INVITE_MEMBERS);
      expect(viewerPermissions).not.toContain(Permission.MANAGE_TEAM);
    });
  });

  describe('权限检查函数 (Permission Check Functions)', () => {
    test('hasPermission 应该正确检查权限', () => {
      // Owner 权限检查
      expect(hasPermission('owner', Permission.MANAGE_TEAM)).toBe(true);
      expect(hasPermission('owner', Permission.CREATE_EVENTS)).toBe(true);
      expect(hasPermission('owner', Permission.VIEW_EVENTS)).toBe(true);

      // Member 权限检查
      expect(hasPermission('member', Permission.CREATE_EVENTS)).toBe(true);
      expect(hasPermission('member', Permission.MANAGE_TEAM)).toBe(false);
      expect(hasPermission('member', Permission.EDIT_ALL_EVENTS)).toBe(false);

      // Viewer 权限检查
      expect(hasPermission('viewer', Permission.VIEW_EVENTS)).toBe(true);
      expect(hasPermission('viewer', Permission.CREATE_EVENTS)).toBe(false);
      expect(hasPermission('viewer', Permission.INVITE_MEMBERS)).toBe(false);
    });

    test('getUserPermissions 应该返回正确的权限列表', () => {
      const ownerPermissions = getUserPermissions('owner');
      const memberPermissions = getUserPermissions('member');
      const viewerPermissions = getUserPermissions('viewer');

      expect(ownerPermissions.length).toBeGreaterThan(memberPermissions.length);
      expect(memberPermissions.length).toBeGreaterThan(
        viewerPermissions.length
      );

      expect(ownerPermissions).toEqual(ROLE_PERMISSIONS.owner);
      expect(memberPermissions).toEqual(ROLE_PERMISSIONS.member);
      expect(viewerPermissions).toEqual(ROLE_PERMISSIONS.viewer);
    });
  });

  describe('事件权限检查 (Event Permission Checks)', () => {
    const userId = 'user123';
    const otherUserId = 'user456';

    test('canEditEvent 应该正确检查编辑权限', () => {
      // Owner 可以编辑所有事件
      expect(canEditEvent('owner', otherUserId, userId)).toBe(true);
      expect(canEditEvent('owner', userId, userId)).toBe(true);

      // Member 只能编辑自己创建的事件
      expect(canEditEvent('member', userId, userId)).toBe(true);
      expect(canEditEvent('member', otherUserId, userId)).toBe(false);

      // Viewer 不能编辑任何事件
      expect(canEditEvent('viewer', userId, userId)).toBe(false);
      expect(canEditEvent('viewer', otherUserId, userId)).toBe(false);
    });

    test('canDeleteEvent 应该正确检查删除权限', () => {
      // Owner 可以删除所有事件
      expect(canDeleteEvent('owner', otherUserId, userId)).toBe(true);
      expect(canDeleteEvent('owner', userId, userId)).toBe(true);

      // Member 只能删除自己创建的事件
      expect(canDeleteEvent('member', userId, userId)).toBe(true);
      expect(canDeleteEvent('member', otherUserId, userId)).toBe(false);

      // Viewer 不能删除任何事件
      expect(canDeleteEvent('viewer', userId, userId)).toBe(false);
      expect(canDeleteEvent('viewer', otherUserId, userId)).toBe(false);
    });
  });

  describe('团队管理权限检查 (Team Management Permission Checks)', () => {
    test('canManageMembers 应该正确检查成员管理权限', () => {
      expect(canManageMembers('owner')).toBe(true);
      expect(canManageMembers('member')).toBe(false);
      expect(canManageMembers('viewer')).toBe(false);
    });

    test('canInviteMembers 应该正确检查邀请权限', () => {
      expect(canInviteMembers('owner')).toBe(true);
      expect(canInviteMembers('member')).toBe(true);
      expect(canInviteMembers('viewer')).toBe(false);
    });

    test('canManageTeamSettings 应该正确检查团队设置权限', () => {
      expect(canManageTeamSettings('owner')).toBe(true);
      expect(canManageTeamSettings('member')).toBe(false);
      expect(canManageTeamSettings('viewer')).toBe(false);
    });

    test('canManageSubscriptions 应该正确检查订阅管理权限', () => {
      expect(canManageSubscriptions('owner')).toBe(true);
      expect(canManageSubscriptions('member')).toBe(false);
      expect(canManageSubscriptions('viewer')).toBe(false);
    });
  });

  describe('权限要求函数 (Permission Requirement Functions)', () => {
    test('requirePermission 应该在权限不足时抛出错误', () => {
      // 有权限时不应该抛出错误
      expect(() =>
        requirePermission('owner', Permission.MANAGE_TEAM)
      ).not.toThrow();
      expect(() =>
        requirePermission('member', Permission.CREATE_EVENTS)
      ).not.toThrow();
      expect(() =>
        requirePermission('viewer', Permission.VIEW_EVENTS)
      ).not.toThrow();

      // 权限不足时应该抛出 PermissionError
      expect(() => requirePermission('member', Permission.MANAGE_TEAM)).toThrow(
        PermissionError
      );
      expect(() =>
        requirePermission('viewer', Permission.CREATE_EVENTS)
      ).toThrow(PermissionError);

      // 检查错误信息
      try {
        requirePermission('viewer', Permission.CREATE_EVENTS);
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError);
        expect((error as PermissionError).requiredPermission).toBe(
          Permission.CREATE_EVENTS
        );
        expect((error as PermissionError).userRole).toBe('viewer');
      }
    });

    test('requireEventEditPermission 应该正确验证事件编辑权限', () => {
      const userId = 'user123';
      const otherUserId = 'user456';

      // Owner 可以编辑任何事件
      expect(() =>
        requireEventEditPermission('owner', otherUserId, userId)
      ).not.toThrow();

      // Member 可以编辑自己的事件
      expect(() =>
        requireEventEditPermission('member', userId, userId)
      ).not.toThrow();

      // Member 不能编辑他人的事件
      expect(() =>
        requireEventEditPermission('member', otherUserId, userId)
      ).toThrow(PermissionError);

      // Viewer 不能编辑任何事件
      expect(() =>
        requireEventEditPermission('viewer', userId, userId)
      ).toThrow(PermissionError);
    });

    test('requireEventDeletePermission 应该正确验证事件删除权限', () => {
      const userId = 'user123';
      const otherUserId = 'user456';

      // Owner 可以删除任何事件
      expect(() =>
        requireEventDeletePermission('owner', otherUserId, userId)
      ).not.toThrow();

      // Member 可以删除自己的事件
      expect(() =>
        requireEventDeletePermission('member', userId, userId)
      ).not.toThrow();

      // Member 不能删除他人的事件
      expect(() =>
        requireEventDeletePermission('member', otherUserId, userId)
      ).toThrow(PermissionError);

      // Viewer 不能删除任何事件
      expect(() =>
        requireEventDeletePermission('viewer', userId, userId)
      ).toThrow(PermissionError);
    });
  });

  describe('PermissionError 类 (PermissionError Class)', () => {
    test('PermissionError 应该包含正确的信息', () => {
      const permission = Permission.CREATE_EVENTS;
      const role: UserRole = 'viewer';
      const message = '权限不足测试';

      const error = new PermissionError(message, permission, role);

      expect(error.name).toBe('PermissionError');
      expect(error.message).toBe(message);
      expect(error.requiredPermission).toBe(permission);
      expect(error.userRole).toBe(role);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
