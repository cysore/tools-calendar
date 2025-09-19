/**
 * Protected Route component for client-side route protection
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/types/auth';
import { hasRole } from '@/lib/auth-utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      router.push(redirectTo);
      return;
    }

    // Check role requirements if specified
    if (requiredRole && user?.role) {
      if (!hasRole(user.role, requiredRole)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, status, router, requiredRole, redirectTo]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show fallback if not authenticated
  if (status === 'unauthenticated') {
    return fallback || null;
  }

  // Check role requirements
  if (requiredRole && user?.role && !hasRole(user.role, requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            访问被拒绝
          </h1>
          <p className="text-muted-foreground">您没有权限访问此页面。</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
