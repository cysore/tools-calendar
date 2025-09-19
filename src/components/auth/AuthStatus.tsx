/**
 * Authentication Status component for testing and debugging
 */

'use client';

import { useAuth } from '@/hooks/useAuth';

export function AuthStatus() {
  const { user, status } = useAuth();

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2">Authentication Status</h3>
      <div className="space-y-1 text-sm">
        <p>
          <strong>Status:</strong> {status}
        </p>
        {user && (
          <>
            <p>
              <strong>User ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            {user.role && (
              <p>
                <strong>Role:</strong> {user.role}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
