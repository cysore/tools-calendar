/**
 * Security utilities for input validation, XSS protection, and CSRF protection
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

// XSS Protection utilities
export class XSSProtection {
  // HTML entities to escape
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  /**
   * Escape HTML entities to prevent XSS attacks
   */
  static escapeHtml(text: string): string {
    return text.replace(/[&<>"'/]/g, match => {
      return XSSProtection.HTML_ENTITIES[match] || match;
    });
  }

  /**
   * Sanitize HTML content by removing dangerous tags and attributes
   */
  static sanitizeHtml(html: string): string {
    // Remove script tags and their content
    let sanitized = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );

    // Remove dangerous protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');

    // Remove dangerous tags
    const dangerousTags = [
      'script',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'link',
      'meta',
      'style',
      'base',
    ];

    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');

      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');
    });

    // Remove dangerous attributes
    const dangerousAttrs = [
      'onclick',
      'onload',
      'onerror',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onkeydown',
      'onkeyup',
      'onkeypress',
    ];

    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]*`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate and sanitize URL to prevent XSS through href attributes
   */
  static sanitizeUrl(url: string): string {
    const trimmed = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
    const lowerUrl = trimmed.toLowerCase();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '#';
      }
    }

    // Only allow http, https, mailto, and relative URLs
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('#')
    ) {
      return trimmed;
    }

    // If it doesn't match allowed patterns, make it relative
    return `/${trimmed}`;
  }
}

// CSRF Protection utilities
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_HEADER = 'x-csrf-token';
  private static readonly TOKEN_COOKIE = 'csrf-token';

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(CSRFProtection.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(request: NextRequest): boolean {
    // Skip CSRF validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const headerToken = request.headers.get(CSRFProtection.TOKEN_HEADER);
    const cookieToken = request.cookies.get(CSRFProtection.TOKEN_COOKIE)?.value;

    if (!headerToken || !cookieToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return CSRFProtection.constantTimeCompare(headerToken, cookieToken);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get CSRF token from request cookies
   */
  static getTokenFromRequest(request: NextRequest): string | null {
    return request.cookies.get(CSRFProtection.TOKEN_COOKIE)?.value || null;
  }
}

// Input validation and sanitization
export class InputValidator {
  /**
   * Validate and sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters, but preserve spaces
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Check length first
    if (email.length > 254) {
      return false;
    }

    // Check for basic format
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
      return false;
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return false;
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }

  /**
   * Validate and sanitize numeric input
   */
  static validateNumber(input: any, min?: number, max?: number): number {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number format');
    }

    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`);
    }

    return num;
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate date string format
   */
  static validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  static sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    let sanitized = filename.replace(/[\/\\:*?"<>|]/g, '_');

    // Remove leading dots and spaces
    sanitized = sanitized.replace(/^[.\s]+/, '');

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized || 'file';
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static readonly requests = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private static readonly DEFAULT_WINDOW = 60 * 1000; // 1 minute
  private static readonly DEFAULT_LIMIT = 100; // 100 requests per minute

  /**
   * Check if request should be rate limited
   */
  static isRateLimited(
    identifier: string,
    limit: number = RateLimiter.DEFAULT_LIMIT,
    windowMs: number = RateLimiter.DEFAULT_WINDOW
  ): boolean {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;

    const current = RateLimiter.requests.get(key);

    if (!current) {
      RateLimiter.requests.set(key, { count: 1, resetTime: now + windowMs });
      return false;
    }

    if (current.count >= limit) {
      return true;
    }

    current.count++;
    return false;
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();
    Array.from(RateLimiter.requests.entries()).forEach(([key, value]) => {
      if (now > value.resetTime) {
        RateLimiter.requests.delete(key);
      }
    });
  }
}

// Security headers utilities
export class SecurityHeaders {
  /**
   * Get security headers for API responses
   */
  static getApiHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  }

  /**
   * Get CORS headers for API responses
   */
  static getCorsHeaders(origin?: string): Record<string, string> {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === 'development' && origin.includes('localhost'));

    return {
      'Access-Control-Allow-Origin': isAllowed ? origin || '*' : 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }
}

// Audit logging utilities
export class AuditLogger {
  /**
   * Log security-related events
   */
  static logSecurityEvent(
    event: string,
    userId?: string,
    details?: Record<string, any>,
    request?: NextRequest
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip: request?.ip || request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown',
      details,
    };

    // In production, this should be sent to a proper logging service
    console.log('[SECURITY]', JSON.stringify(logEntry));
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'password_reset',
    userId: string,
    success: boolean,
    request?: NextRequest
  ): void {
    AuditLogger.logSecurityEvent(
      `auth_${action}`,
      userId,
      { success },
      request
    );
  }

  /**
   * Log data access events
   */
  static logDataAccess(
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete',
    userId: string,
    resourceId?: string,
    request?: NextRequest
  ): void {
    AuditLogger.logSecurityEvent(
      `data_${action}`,
      userId,
      { resource, resourceId },
      request
    );
  }
}
