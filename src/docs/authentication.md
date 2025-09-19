# Authentication System Documentation

## Overview

The authentication system is built using NextAuth.js with AWS Cognito integration and provides comprehensive user authentication, authorization, and session management.

## Components

### 1. Authentication Types (`src/types/auth.ts`)

- `User`: Basic user information
- `AuthUser`: Extended user with role information
- `UserRole`: Role enumeration (owner, member, viewer)
- `AuthSession`: Session data structure
- `AuthContextType`: Authentication context interface

### 2. NextAuth Configuration (`src/lib/auth.ts`)

- AWS Cognito provider configuration
- DynamoDB adapter for session storage
- JWT strategy with 30-day expiration
- Custom callbacks for token and session handling

### 3. Authentication Utilities (`src/lib/auth-utils.ts`)

- `hasRole()`: Check if user has required role or higher
- `requireRole()`: Throw error if user lacks required role
- `isTeamOwner()`: Check if user is team owner
- `canEditEvents()`: Check if user can edit events
- `canManageTeam()`: Check if user can manage team

### 4. Server-side Utilities (`src/lib/auth-server.ts`)

- `getAuthSession()`: Get current session on server
- `requireAuth()`: Require authentication with redirect
- `requireRole()`: Require specific role with error handling
- `checkRole()`: Check if current user has required role
- `getUserId()`: Get user ID from session
- `requireUserId()`: Require user ID with error handling

### 5. Authentication Hook (`src/hooks/useAuth.ts`)

- `useAuth()`: Client-side authentication hook
- Provides login, logout, register, resetPassword functions
- Returns user, session, and status information

### 6. Route Protection

#### Middleware (`src/middleware.ts`)

- Protects all routes except auth pages and public assets
- Redirects unauthenticated users to signin page

#### ProtectedRoute Component (`src/components/auth/ProtectedRoute.tsx`)

- Client-side route protection with role checking
- Shows loading states and error messages
- Supports role-based access control

### 7. Authentication Provider (`src/components/auth/AuthProvider.tsx`)

- Wraps the app with NextAuth SessionProvider
- Provides authentication context to all components

### 8. Authentication Configuration (`src/lib/auth-config.ts`)

- Centralized configuration constants
- Password validation with customizable rules
- Email validation utilities
- Environment validation helpers

### 9. API Authentication Middleware (`src/lib/api-auth.ts`)

- `withAuth()`: Protect API routes with authentication
- `withRole()`: Protect API routes with role requirements
- `createErrorResponse()`: Standardized error responses
- `createSuccessResponse()`: Standardized success responses
- `validateRequestBody()`: Request validation helper

## Usage Examples

### Basic Authentication Check

```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, status } = useAuth();

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Please sign in</div>;

  return <div>Welcome, {user?.name}!</div>;
}
```

### Role-based Protection

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function AdminPanel() {
  return (
    <ProtectedRoute requiredRole="owner">
      <div>Admin content here</div>
    </ProtectedRoute>
  );
}
```

### Server-side Authentication

```tsx
import { requireAuth } from '@/lib/auth-server';

export default async function ProtectedPage() {
  const session = await requireAuth(); // Redirects if not authenticated

  return <div>Hello, {session.user.name}!</div>;
}
```

### Permission Checking

```tsx
import { hasRole, canEditEvents } from '@/lib/auth-utils';

function EventActions({ userRole }: { userRole: UserRole }) {
  return (
    <div>
      {canEditEvents(userRole) && <button>Edit Event</button>}
      {hasRole(userRole, 'owner') && <button>Delete Event</button>}
    </div>
  );
}
```

## API Endpoints

### Registration (`POST /api/auth/register`)

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

### Password Reset (`POST /api/auth/reset-password`)

```json
{
  "email": "user@example.com"
}
```

## Environment Variables

Required environment variables for authentication:

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# AWS Cognito
COGNITO_CLIENT_ID=your-cognito-client-id
COGNITO_CLIENT_SECRET=your-cognito-client-secret
COGNITO_ISSUER=https://cognito-idp.region.amazonaws.com/user-pool-id

# AWS DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
DYNAMODB_TABLE_NAME=team-calendar-sync
```

## Role Hierarchy

1. **Viewer**: Can only view events and team information
2. **Member**: Can view and create/edit events
3. **Owner**: Full access including team management

## Security Features

- JWT-based session management
- Role-based access control
- Input validation on all endpoints
- HTTPS enforcement via middleware
- XSS protection through input sanitization
- CSRF protection via NextAuth.js

## Testing

The authentication system includes comprehensive unit tests:

- Role permission checking
- Authentication utilities
- Input validation
- Error handling

Run tests with:

```bash
npm test -- --testPathPattern="auth"
```
