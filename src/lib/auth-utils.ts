/**
 * Authentication utility functions
 */

import { UserRole } from '@/types/auth';

// Note: Server-side authentication functions will be implemented
// in a separate file to avoid NextAuth.js dependency issues in tests

/**
 * Check if user has required role for a team
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    member: 2,
    owner: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Require specific role - throw error if insufficient permissions
 */
export function requireRole(userRole: UserRole, requiredRole: UserRole): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new Error(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`
    );
  }
}

/**
 * Check if user is team owner
 */
export function isTeamOwner(userRole: UserRole): boolean {
  return userRole === 'owner';
}

/**
 * Check if user can edit events (member or owner)
 */
export function canEditEvents(userRole: UserRole): boolean {
  return hasRole(userRole, 'member');
}

/**
 * Check if user can manage team (owner only)
 */
export function canManageTeam(userRole: UserRole): boolean {
  return isTeamOwner(userRole);
}
