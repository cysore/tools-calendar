/**
 * 用户角色和权限系统
 * User roles and permissions system
 */

import { UserRole } from '@/types/auth';

// 权限枚举
export enum Permission {
  // 团队管理权限
  MANAGE_TEAM = 'manage_team',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  UPDATE_MEMBER_ROLES = 'update_member_roles',

  // 事件管理权限
  CREATE_EVENTS = 'create_events',
  EDIT_ALL_EVENTS = 'edit_all_events',
  EDIT_OWN_EVENTS = 'edit_own_events',
  DELETE_ALL_EVENTS = 'delete_all_events',
  DELETE_OWN_EVENTS = 'delete_own_events',
  VIEW_EVENTS = 'view_events',

  // 订阅管理权限
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  VIEW_SUBSCRIPTIONS = 'view_subscriptions',

  // 团队设置权限
  UPDATE_TEAM_SETTINGS = 'update_team_settings',
  VIEW_TEAM_SETTINGS = 'view_team_settings',
}

// 角色权限映射
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // 团队管理权限 (所有)
    Permission.MANAGE_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.UPDATE_MEMBER_ROLES,

    // 事件管理权限 (所有)
    Permission.CREATE_EVENTS,
    Permission.EDIT_ALL_EVENTS,
    Permission.EDIT_OWN_EVENTS,
    Permission.DELETE_ALL_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_EVENTS,

    // 订阅管理权限 (所有)
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.VIEW_SUBSCRIPTIONS,

    // 团队设置权限 (所有)
    Permission.UPDATE_TEAM_SETTINGS,
    Permission.VIEW_TEAM_SETTINGS,
  ],

  member: [
    // 团队管理权限 (有限)
    Permission.INVITE_MEMBERS,

    // 事件管理权限 (创建和编辑自己的)
    Permission.CREATE_EVENTS,
    Permission.EDIT_OWN_EVENTS,
    Permission.DELETE_OWN_EVENTS,
    Permission.VIEW_EVENTS,

    // 订阅管理权限 (查看)
    Permission.VIEW_SUBSCRIPTIONS,

    // 团队设置权限 (查看)
    Permission.VIEW_TEAM_SETTINGS,
  ],

  viewer: [
    // 事件管理权限 (仅查看)
    Permission.VIEW_EVENTS,

    // 订阅管理权限 (查看)
    Permission.VIEW_SUBSCRIPTIONS,

    // 团队设置权限 (查看)
    Permission.VIEW_TEAM_SETTINGS,
  ],
};

/**
 * 检查用户角色是否具有指定权限
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
}

/**
 * 检查用户是否可以编辑指定事件
 */
export function canEditEvent(
  userRole: UserRole,
  eventCreatedBy: string,
  userId: string
): boolean {
  // Owner 可以编辑所有事件
  if (hasPermission(userRole, Permission.EDIT_ALL_EVENTS)) {
    return true;
  }

  // Member 可以编辑自己创建的事件
  if (
    hasPermission(userRole, Permission.EDIT_OWN_EVENTS) &&
    eventCreatedBy === userId
  ) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否可以删除指定事件
 */
export function canDeleteEvent(
  userRole: UserRole,
  eventCreatedBy: string,
  userId: string
): boolean {
  // Owner 可以删除所有事件
  if (hasPermission(userRole, Permission.DELETE_ALL_EVENTS)) {
    return true;
  }

  // Member 可以删除自己创建的事件
  if (
    hasPermission(userRole, Permission.DELETE_OWN_EVENTS) &&
    eventCreatedBy === userId
  ) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否可以管理团队成员
 */
export function canManageMembers(userRole: UserRole): boolean {
  return (
    hasPermission(userRole, Permission.REMOVE_MEMBERS) ||
    hasPermission(userRole, Permission.UPDATE_MEMBER_ROLES)
  );
}

/**
 * 检查用户是否可以邀请成员
 */
export function canInviteMembers(userRole: UserRole): boolean {
  return hasPermission(userRole, Permission.INVITE_MEMBERS);
}

/**
 * 检查用户是否可以管理团队设置
 */
export function canManageTeamSettings(userRole: UserRole): boolean {
  return hasPermission(userRole, Permission.UPDATE_TEAM_SETTINGS);
}

/**
 * 检查用户是否可以管理订阅
 */
export function canManageSubscriptions(userRole: UserRole): boolean {
  return hasPermission(userRole, Permission.MANAGE_SUBSCRIPTIONS);
}

/**
 * 获取用户角色的所有权限
 */
export function getUserPermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole];
}

/**
 * 权限验证错误类
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public readonly requiredPermission: Permission,
    public readonly userRole: UserRole
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 要求用户具有指定权限，否则抛出错误
 */
export function requirePermission(
  userRole: UserRole,
  permission: Permission
): void {
  if (!hasPermission(userRole, permission)) {
    throw new PermissionError(
      `权限不足。需要权限: ${permission}，当前角色: ${userRole}`,
      permission,
      userRole
    );
  }
}

/**
 * 要求用户可以编辑指定事件，否则抛出错误
 */
export function requireEventEditPermission(
  userRole: UserRole,
  eventCreatedBy: string,
  userId: string
): void {
  if (!canEditEvent(userRole, eventCreatedBy, userId)) {
    throw new PermissionError(
      `无权限编辑此事件。角色: ${userRole}`,
      Permission.EDIT_OWN_EVENTS,
      userRole
    );
  }
}

/**
 * 要求用户可以删除指定事件，否则抛出错误
 */
export function requireEventDeletePermission(
  userRole: UserRole,
  eventCreatedBy: string,
  userId: string
): void {
  if (!canDeleteEvent(userRole, eventCreatedBy, userId)) {
    throw new PermissionError(
      `无权限删除此事件。角色: ${userRole}`,
      Permission.DELETE_OWN_EVENTS,
      userRole
    );
  }
}
