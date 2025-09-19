/**
 * Authentication related types and interfaces
 */

export type UserRole = 'owner' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  role?: UserRole; // Current role in the active team context
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
  accessToken?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  resetPassword: (request: ResetPasswordRequest) => Promise<void>;
}

// Team-based authentication interfaces
export interface TeamMember {
  userId: string;
  teamId: string;
  role: UserRole;
  joinedAt: string;
  user?: User;
}

export interface UserTeamContext {
  teamId: string;
  role: UserRole;
  permissions: string[];
}

export interface AuthenticatedUser extends AuthUser {
  teamContext?: UserTeamContext;
}

// API Authentication interfaces
export interface ApiAuthContext {
  userId: string;
  email: string;
  teamId?: string;
  role?: UserRole;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

// NextAuth.js extended types
declare module 'next-auth' {
  interface Session {
    user: AuthUser;
    accessToken?: string;
  }

  interface User extends AuthUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    userId: string;
  }
}
