/**
 * Custom hook for authentication
 */

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  AuthContextType,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordRequest,
} from '@/types/auth';

export function useAuth(): AuthContextType {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const result = await signIn('cognito', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut({ redirect: false });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      // Call registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      // After successful registration, sign in the user
      await login({
        email: credentials.email,
        password: credentials.password,
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const resetPassword = async (
    request: ResetPasswordRequest
  ): Promise<void> => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  return {
    user: session?.user || null,
    session: session || null,
    status:
      status === 'loading'
        ? 'loading'
        : session
          ? 'authenticated'
          : 'unauthenticated',
    login,
    logout,
    register,
    resetPassword,
  };
}
