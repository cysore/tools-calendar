/**
 * Authentication and security middleware for route protection
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import {
  CSRFProtection,
  RateLimiter,
  SecurityHeaders,
  AuditLogger,
} from './lib/security';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const response = NextResponse.next();

    // Apply security headers to all responses
    const securityHeaders = SecurityHeaders.getApiHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate limiting for API routes
    if (pathname.startsWith('/api/')) {
      const identifier =
        req.ip || req.headers.get('x-forwarded-for') || 'unknown';

      // Different limits for different endpoints
      let limit = 100; // Default: 100 requests per minute
      if (pathname.includes('/auth/')) {
        limit = 10; // Auth endpoints: 10 requests per minute
      } else if (pathname.includes('/events')) {
        limit = 200; // Event endpoints: 200 requests per minute
      }

      if (RateLimiter.isRateLimited(identifier, limit)) {
        AuditLogger.logSecurityEvent(
          'rate_limit_exceeded',
          token?.userId,
          { pathname },
          req
        );
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': '60',
            ...securityHeaders,
          },
        });
      }
    }

    // CSRF protection for API routes (except auth routes)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      if (!CSRFProtection.validateToken(req)) {
        AuditLogger.logSecurityEvent(
          'csrf_validation_failed',
          token?.userId,
          { pathname },
          req
        );
        return new NextResponse('CSRF Token Invalid', {
          status: 403,
          headers: securityHeaders,
        });
      }
    }

    // Generate CSRF token for authenticated users
    if (token && !req.cookies.get('csrf-token')) {
      const csrfToken = CSRFProtection.generateToken();
      response.cookies.set('csrf-token', csrfToken, {
        httpOnly: false, // Needs to be accessible by client-side JS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    // Redirect authenticated users away from auth pages
    if (token && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Redirect unauthenticated users to login from protected pages
    if (!token && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Add user info and security headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(req.headers);

      if (token) {
        requestHeaders.set('x-user-id', token.userId);
        requestHeaders.set('x-user-email', token.email || '');
      }

      // Add CORS headers for API routes
      const origin = req.headers.get('origin');
      const corsHeaders = SecurityHeaders.getCorsHeaders(origin || undefined);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow access to auth pages
        if (pathname.startsWith('/auth/')) {
          return true;
        }

        // Allow access to public pages and API auth routes
        if (
          pathname === '/' ||
          pathname.startsWith('/api/auth/') ||
          pathname === '/unauthorized' ||
          pathname === '/error'
        ) {
          return true;
        }

        // Require authentication for protected pages
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
          return !!token;
        }

        // Allow all other pages by default
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - sw.js and workbox files (PWA)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|sw.js|workbox-.*\\.js).*)',
  ],
};
