/**
 * 权限守卫组件
 * Permission guard component for conditional rendering based on user permissions
 */

import React from 'react';
import { UserRole } from '@/types/auth';
import {
  Permission,
  hasPermission,
  canEditEvent,
  canDeleteEvent,
} from '@/lib/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  userRole: UserRole;
  permission?: Permission;
  eventCreatedBy?: string;
  userId?: string;
  action?: 'edit' | 'delete';
  fallback?: React.ReactNode;
}

/**
 * 权限守卫组件 - 根据用户权限条件渲染内容
 */
export function PermissionGuard({
  children,
  userRole,
  permission,
  eventCreatedBy,
  userId,
  action,
  fallback = null,
}: PermissionGuardProps) {
  let hasAccess = false;

  // 检查通用权限
  if (permission) {
    hasAccess = hasPermission(userRole, permission);
  }

  // 检查事件特定权限
  if (eventCreatedBy && userId && action) {
    if (action === 'edit') {
      hasAccess = canEditEvent(userRole, eventCreatedBy, userId);
    } else if (action === 'delete') {
      hasAccess = canDeleteEvent(userRole, eventCreatedBy, userId);
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * 团队管理权限守卫
 */
interface TeamManagementGuardProps {
  children: React.ReactNode;
  userRole: UserRole;
  fallback?: React.ReactNode;
}

export function TeamManagementGuard({
  children,
  userRole,
  fallback = null,
}: TeamManagementGuardProps) {
  return (
    <PermissionGuard
      userRole={userRole}
      permission={Permission.MANAGE_TEAM}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * 成员邀请权限守卫
 */
export function MemberInviteGuard({
  children,
  userRole,
  fallback = null,
}: TeamManagementGuardProps) {
  return (
    <PermissionGuard
      userRole={userRole}
      permission={Permission.INVITE_MEMBERS}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * 事件编辑权限守卫
 */
interface EventEditGuardProps {
  children: React.ReactNode;
  userRole: UserRole;
  eventCreatedBy: string;
  userId: string;
  fallback?: React.ReactNode;
}

export function EventEditGuard({
  children,
  userRole,
  eventCreatedBy,
  userId,
  fallback = null,
}: EventEditGuardProps) {
  return (
    <PermissionGuard
      userRole={userRole}
      eventCreatedBy={eventCreatedBy}
      userId={userId}
      action="edit"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * 事件删除权限守卫
 */
export function EventDeleteGuard({
  children,
  userRole,
  eventCreatedBy,
  userId,
  fallback = null,
}: EventEditGuardProps) {
  return (
    <PermissionGuard
      userRole={userRole}
      eventCreatedBy={eventCreatedBy}
      userId={userId}
      action="delete"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

/**
 * 权限钩子 - 在组件中使用权限检查
 */
export function usePermissions(userRole: UserRole) {
  return {
    hasPermission: (permission: Permission) =>
      hasPermission(userRole, permission),
    canEditEvent: (eventCreatedBy: string, userId: string) =>
      canEditEvent(userRole, eventCreatedBy, userId),
    canDeleteEvent: (eventCreatedBy: string, userId: string) =>
      canDeleteEvent(userRole, eventCreatedBy, userId),
    canManageTeam: () => hasPermission(userRole, Permission.MANAGE_TEAM),
    canInviteMembers: () => hasPermission(userRole, Permission.INVITE_MEMBERS),
    canManageSubscriptions: () =>
      hasPermission(userRole, Permission.MANAGE_SUBSCRIPTIONS),
    canUpdateTeamSettings: () =>
      hasPermission(userRole, Permission.UPDATE_TEAM_SETTINGS),
  };
}
