/**
 * Authentication Provider component with enhanced error handling and state management
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, createContext, useContext, useState } from 'react';

interface AuthProviderProps {
  children: ReactNode;
  session?: any;
}

interface AuthErrorContextType {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const AuthErrorContext = createContext<AuthErrorContextType | undefined>(
  undefined
);

export function useAuthError() {
  const context = useContext(AuthErrorContext);
  if (!context) {
    throw new Error('useAuthError must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const authErrorValue = {
    error,
    setError,
    clearError,
  };

  return (
    <SessionProvider session={session}>
      <AuthErrorContext.Provider value={authErrorValue}>
        {children}
      </AuthErrorContext.Provider>
    </SessionProvider>
  );
}
