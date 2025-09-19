/**
 * Server-side authentication utility functions
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { AuthSession, UserRole } from '@/types/auth';
import { redirect } from 'next/navigation';
import { hasRole } from './auth-utils';

/**
 * Get the current session on the server side
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);
  return session as AuthSession | null;
}

/**
 * Require authentication - redirect to signin if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return session;
}

/**
 * Require specific role - throw error if insufficient permissions
 */
export async function requireRole(
  requiredRole: UserRole
): Promise<AuthSession> {
  const session = await requireAuth();

  if (!session.user.role || !hasRole(session.user.role, requiredRole)) {
    throw new Error(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${session.user.role || 'none'}`
    );
  }

  return session;
}

/**
 * Check if current user has required role
 */
export async function checkRole(requiredRole: UserRole): Promise<boolean> {
  const session = await getAuthSession();

  if (!session?.user.role) {
    return false;
  }

  return hasRole(session.user.role, requiredRole);
}

/**
 * Get user ID from session
 */
export async function getUserId(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.user.id || null;
}

/**
 * Require user ID - throw error if not authenticated
 */
export async function requireUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user.id;
}
