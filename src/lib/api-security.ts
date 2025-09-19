/**
 * API security middleware and utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import {
  InputValidator,
  XSSProtection,
  CSRFProtection,
  SecurityHeaders,
  AuditLogger,
} from './security';

export interface SecurityOptions {
  requireAuth?: boolean;
  requireCsrf?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validateInput?: boolean;
  logAccess?: boolean;
}

export interface SecureApiContext {
  req: NextRequest;
  userId?: string;
  userEmail?: string;
}

/**
 * Security wrapper for API route handlers
 */
export function withSecurity(
  handler: (
    req: NextRequest,
    context: SecureApiContext
  ) => Promise<NextResponse>,
  options: SecurityOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      requireAuth = true,
      requireCsrf = true,
      validateInput = true,
      logAccess = true,
    } = options;

    try {
      // Get security headers
      const securityHeaders = SecurityHeaders.getApiHeaders();

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        const origin = req.headers.get('origin');
        const corsHeaders = SecurityHeaders.getCorsHeaders(origin || undefined);
        return new NextResponse(null, {
          status: 200,
          headers: { ...securityHeaders, ...corsHeaders },
        });
      }

      // Authentication check
      let userId: string | undefined;
      let userEmail: string | undefined;

      if (requireAuth) {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
          if (logAccess) {
            AuditLogger.logSecurityEvent(
              'unauthorized_access',
              undefined,
              {
                path: req.nextUrl.pathname,
                method: req.method,
              },
              req
            );
          }
          return new NextResponse('Unauthorized', {
            status: 401,
            headers: securityHeaders,
          });
        }
        userId = session.user.id;
        userEmail = session.user.email || undefined;
      }

      // CSRF protection
      if (requireCsrf && !CSRFProtection.validateToken(req)) {
        if (logAccess) {
          AuditLogger.logSecurityEvent(
            'csrf_validation_failed',
            userId,
            {
              path: req.nextUrl.pathname,
              method: req.method,
            },
            req
          );
        }
        return new NextResponse('CSRF Token Invalid', {
          status: 403,
          headers: securityHeaders,
        });
      }

      // Input validation for request body
      if (validateInput && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          const body = await req.json();
          validateRequestBody(body);
        } catch (error) {
          if (logAccess) {
            AuditLogger.logSecurityEvent(
              'input_validation_failed',
              userId,
              {
                path: req.nextUrl.pathname,
                method: req.method,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              req
            );
          }
          return new NextResponse('Invalid Input', {
            status: 400,
            headers: securityHeaders,
          });
        }
      }

      // Log access if enabled
      if (logAccess) {
        AuditLogger.logSecurityEvent(
          'api_access',
          userId,
          {
            path: req.nextUrl.pathname,
            method: req.method,
          },
          req
        );
      }

      // Create secure context
      const context: SecureApiContext = {
        req,
        userId,
        userEmail,
      };

      // Call the actual handler
      const response = await handler(req, context);

      // Add security headers to response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Add CORS headers
      const origin = req.headers.get('origin');
      const corsHeaders = SecurityHeaders.getCorsHeaders(origin || undefined);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Security middleware error:', error);

      if (logAccess) {
        AuditLogger.logSecurityEvent(
          'api_error',
          undefined,
          {
            path: req.nextUrl.pathname,
            method: req.method,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          req
        );
      }

      return new NextResponse('Internal Server Error', {
        status: 500,
        headers: SecurityHeaders.getApiHeaders(),
      });
    }
  };
}

/**
 * Validate request body for common security issues
 */
function validateRequestBody(body: any): void {
  if (!body || typeof body !== 'object') {
    return;
  }

  // Recursively validate all string values
  function validateValue(value: any, path: string = ''): void {
    if (typeof value === 'string') {
      // Check for potential XSS
      if (value.includes('<script') || value.includes('javascript:')) {
        throw new Error(`Potentially malicious content detected in ${path}`);
      }

      // Check for SQL injection patterns (even though we use NoSQL)
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
        /(UNION\s+SELECT)/i,
        /(\bOR\s+1\s*=\s*1\b)/i,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          throw new Error(
            `Potentially malicious SQL pattern detected in ${path}`
          );
        }
      }

      // Validate string length
      if (value.length > 10000) {
        throw new Error(`String too long in ${path}`);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        validateValue(item, `${path}[${index}]`);
      });
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        validateValue(val, path ? `${path}.${key}` : key);
      });
    }
  }

  validateValue(body);
}

/**
 * Sanitize API response data
 */
export function sanitizeResponse(data: any): any {
  if (typeof data === 'string') {
    return XSSProtection.escapeHtml(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeResponse);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeResponse(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Create a secure API response
 */
export function createSecureResponse(
  data: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const sanitizedData = sanitizeResponse(data);
  const securityHeaders = SecurityHeaders.getApiHeaders();

  return NextResponse.json(sanitizedData, {
    status,
    headers: {
      ...securityHeaders,
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response with security headers
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): NextResponse {
  const errorData = {
    success: false,
    error: {
      message: XSSProtection.escapeHtml(message),
      code,
    },
  };

  return NextResponse.json(errorData, {
    status,
    headers: SecurityHeaders.getApiHeaders(),
  });
}
