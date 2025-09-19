/**
 * Authentication middleware for route protection
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Redirect authenticated users away from auth pages
    if (token && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Redirect unauthenticated users to login from protected pages
    if (!token && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Add user info to headers for API routes
    if (token && pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', token.userId);
      requestHeaders.set('x-user-email', token.email || '');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
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
