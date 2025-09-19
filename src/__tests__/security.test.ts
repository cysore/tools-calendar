/**
 * Security utilities tests
 */

import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';
import {
  XSSProtection,
  CSRFProtection,
  InputValidator,
  RateLimiter,
  SecurityHeaders,
} from '../lib/security';

describe('XSSProtection', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const expected =
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      expect(XSSProtection.escapeHtml(input)).toBe(expected);
    });

    it('should escape all dangerous characters', () => {
      const input = '& < > " \' /';
      const expected = '&amp; &lt; &gt; &quot; &#x27; &#x2F;';
      expect(XSSProtection.escapeHtml(input)).toBe(expected);
    });

    it('should handle empty strings', () => {
      expect(XSSProtection.escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const result = XSSProtection.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove dangerous tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Safe</p>';
      const result = XSSProtection.sanitizeHtml(input);
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = XSSProtection.sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<div>Click me</div>');
    });

    it('should handle nested dangerous content', () => {
      const input = '<div><script>alert(1)</script><p>Safe</p></div>';
      const result = XSSProtection.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      expect(XSSProtection.sanitizeUrl(input)).toBe('#');
    });

    it('should allow safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        '/relative/path',
        '#anchor',
        'mailto:test@example.com',
      ];

      safeUrls.forEach(url => {
        expect(XSSProtection.sanitizeUrl(url)).toBe(url);
      });
    });

    it('should make unsafe URLs relative', () => {
      const input = 'example.com';
      expect(XSSProtection.sanitizeUrl(input)).toBe('/example.com');
    });
  });
});

describe('CSRFProtection', () => {
  describe('generateToken', () => {
    it('should generate a token', () => {
      const token = CSRFProtection.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = CSRFProtection.generateToken();
      const token2 = CSRFProtection.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateToken', () => {
    // Mock NextRequest for testing
    const createMockRequest = (
      method: string,
      headerToken?: string,
      cookieToken?: string
    ) => {
      const headers = new Map();
      if (headerToken) {
        headers.set('x-csrf-token', headerToken);
      }

      const cookies = new Map();
      if (cookieToken) {
        cookies.set('csrf-token', { value: cookieToken });
      }

      return {
        method,
        headers: {
          get: (name: string) => headers.get(name) || null,
        },
        cookies: {
          get: (name: string) => cookies.get(name) || undefined,
        },
      } as any;
    };

    it('should allow GET requests without tokens', () => {
      const req = createMockRequest('GET');
      expect(CSRFProtection.validateToken(req)).toBe(true);
    });

    it('should allow HEAD requests without tokens', () => {
      const req = createMockRequest('HEAD');
      expect(CSRFProtection.validateToken(req)).toBe(true);
    });

    it('should allow OPTIONS requests without tokens', () => {
      const req = createMockRequest('OPTIONS');
      expect(CSRFProtection.validateToken(req)).toBe(true);
    });

    it('should reject POST requests without tokens', () => {
      const req = createMockRequest('POST');
      expect(CSRFProtection.validateToken(req)).toBe(false);
    });

    it('should reject requests with mismatched tokens', () => {
      const req = createMockRequest('POST', 'token1', 'token2');
      expect(CSRFProtection.validateToken(req)).toBe(false);
    });

    it('should accept requests with matching tokens', () => {
      const token = 'valid-token';
      const req = createMockRequest('POST', token, token);
      expect(CSRFProtection.validateToken(req)).toBe(true);
    });
  });
});

describe('InputValidator', () => {
  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00\x01World';
      const result = InputValidator.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should normalize whitespace', () => {
      const input = '  Hello   World  ';
      const result = InputValidator.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should truncate long strings', () => {
      const input = 'a'.repeat(2000);
      const result = InputValidator.sanitizeString(input, 100);
      expect(result.length).toBe(100);
    });

    it('should throw error for non-string input', () => {
      expect(() => InputValidator.sanitizeString(123 as any)).toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        expect(InputValidator.validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'a'.repeat(250) + '@example.com', // Too long
      ];

      invalidEmails.forEach(email => {
        expect(InputValidator.validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateNumber', () => {
    it('should validate valid numbers', () => {
      expect(InputValidator.validateNumber('123')).toBe(123);
      expect(InputValidator.validateNumber(456)).toBe(456);
      expect(InputValidator.validateNumber('123.45')).toBe(123.45);
    });

    it('should throw error for invalid numbers', () => {
      expect(() => InputValidator.validateNumber('abc')).toThrow();
      expect(() => InputValidator.validateNumber(NaN)).toThrow();
      expect(() => InputValidator.validateNumber(Infinity)).toThrow();
    });

    it('should validate number ranges', () => {
      expect(InputValidator.validateNumber(5, 1, 10)).toBe(5);
      expect(() => InputValidator.validateNumber(0, 1, 10)).toThrow();
      expect(() => InputValidator.validateNumber(11, 1, 10)).toThrow();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = 'file<>:"/\\|?*.txt';
      const result = InputValidator.sanitizeFilename(input);
      expect(result).toBe('file_________.txt');
    });

    it('should remove leading dots and spaces', () => {
      const input = '...  filename.txt';
      const result = InputValidator.sanitizeFilename(input);
      expect(result).toBe('filename.txt');
    });

    it('should handle empty filenames', () => {
      const result = InputValidator.sanitizeFilename('');
      expect(result).toBe('file');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = InputValidator.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.txt')).toBe(true);
    });
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear rate limiter state before each test
    RateLimiter.cleanup();
  });

  it('should allow requests within limit', () => {
    const identifier = 'test-user';

    for (let i = 0; i < 5; i++) {
      expect(RateLimiter.isRateLimited(identifier, 10)).toBe(false);
    }
  });

  it('should block requests exceeding limit', () => {
    const identifier = 'test-user-limit';
    const limit = 3;

    // First 3 requests should be allowed
    for (let i = 0; i < limit; i++) {
      const result = RateLimiter.isRateLimited(identifier, limit);
      expect(result).toBe(false);
    }

    // 4th request should be blocked
    const result = RateLimiter.isRateLimited(identifier, limit);
    expect(result).toBe(true);
  });

  it('should handle different identifiers separately', () => {
    const limit = 2;

    expect(RateLimiter.isRateLimited('user1', limit)).toBe(false);
    expect(RateLimiter.isRateLimited('user2', limit)).toBe(false);
    expect(RateLimiter.isRateLimited('user1', limit)).toBe(false);
    expect(RateLimiter.isRateLimited('user2', limit)).toBe(false);

    // Both users should now be at their limit
    expect(RateLimiter.isRateLimited('user1', limit)).toBe(true);
    expect(RateLimiter.isRateLimited('user2', limit)).toBe(true);
  });
});

describe('SecurityHeaders', () => {
  describe('getApiHeaders', () => {
    it('should return security headers', () => {
      const headers = SecurityHeaders.getApiHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe(
        'strict-origin-when-cross-origin'
      );
      expect(headers['Cache-Control']).toContain('no-store');
    });
  });

  describe('getCorsHeaders', () => {
    it('should return CORS headers', () => {
      const headers = SecurityHeaders.getCorsHeaders('https://example.com');

      expect(headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should handle allowed origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://allowed.com';

      const allowedHeaders = SecurityHeaders.getCorsHeaders(
        'https://allowed.com'
      );
      expect(allowedHeaders['Access-Control-Allow-Origin']).toBe(
        'https://allowed.com'
      );

      const blockedHeaders = SecurityHeaders.getCorsHeaders(
        'https://blocked.com'
      );
      expect(blockedHeaders['Access-Control-Allow-Origin']).toBe('null');

      delete process.env.ALLOWED_ORIGINS;
    });
  });
});

describe('Security Integration', () => {
  it('should handle XSS attempts in various contexts', () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '"><script>alert(1)</script>',
    ];

    xssPayloads.forEach(payload => {
      const sanitized = XSSProtection.sanitizeHtml(payload);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
      // Note: javascript: is removed by sanitizeHtml, so we check it's not there
      if (payload.includes('javascript:')) {
        expect(sanitized).not.toContain('javascript:');
      }
    });
  });

  it('should validate and sanitize complex input objects', () => {
    const maliciousInput = {
      name: '<script>alert("xss")</script>Normal Name',
      description: 'Safe description<iframe src="evil.com"></iframe>',
      email: 'test@example.com',
      nested: {
        value: 'javascript:alert(1)',
      },
    };

    // This would be handled by the API security middleware
    const sanitizedName = XSSProtection.sanitizeHtml(maliciousInput.name);
    const sanitizedDescription = XSSProtection.sanitizeHtml(
      maliciousInput.description
    );

    expect(sanitizedName).not.toContain('<script>');
    expect(sanitizedDescription).not.toContain('<iframe>');
    expect(InputValidator.validateEmail(maliciousInput.email)).toBe(true);
  });
});
