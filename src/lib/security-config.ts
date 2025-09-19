/**
 * Security configuration and constants
 */

export const SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMITS: {
    DEFAULT: {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
    AUTH: {
      requests: 10,
      windowMs: 60 * 1000, // 1 minute
    },
    API: {
      requests: 200,
      windowMs: 60 * 1000, // 1 minute
    },
    UPLOAD: {
      requests: 20,
      windowMs: 60 * 1000, // 1 minute
    },
  },

  // Input validation limits
  INPUT_LIMITS: {
    STRING_MAX_LENGTH: 10000,
    EMAIL_MAX_LENGTH: 254,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 1000,
    TITLE_MAX_LENGTH: 200,
    FILENAME_MAX_LENGTH: 255,
  },

  // Password requirements
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },

  // Session configuration
  SESSION: {
    MAX_AGE: 24 * 60 * 60, // 24 hours
    CSRF_TOKEN_LENGTH: 32,
    CSRF_COOKIE_NAME: 'csrf-token',
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    FONT_SRC: ["'self'", 'https://fonts.gstatic.com'],
    IMG_SRC: ["'self'", 'data:', 'https:'],
    CONNECT_SRC: [
      "'self'",
      'https://api.amazonaws.com',
      'https://*.amazonaws.com',
    ],
    FRAME_ANCESTORS: ["'none'"],
    BASE_URI: ["'self'"],
    FORM_ACTION: ["'self'"],
  },

  // Allowed origins for CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [],

  // Security headers
  SECURITY_HEADERS: {
    HSTS: 'max-age=31536000; includeSubDomains; preload',
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    PERMISSIONS_POLICY:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },

  // Audit logging configuration
  AUDIT_LOG: {
    ENABLED: process.env.NODE_ENV === 'production',
    EVENTS: {
      AUTH_LOGIN: 'auth_login',
      AUTH_LOGOUT: 'auth_logout',
      AUTH_REGISTER: 'auth_register',
      AUTH_PASSWORD_RESET: 'auth_password_reset',
      DATA_CREATE: 'data_create',
      DATA_READ: 'data_read',
      DATA_UPDATE: 'data_update',
      DATA_DELETE: 'data_delete',
      SECURITY_VIOLATION: 'security_violation',
      RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
      CSRF_VALIDATION_FAILED: 'csrf_validation_failed',
      INPUT_VALIDATION_FAILED: 'input_validation_failed',
      UNAUTHORIZED_ACCESS: 'unauthorized_access',
    },
  },

  // File upload security
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
} as const;

/**
 * Environment-specific security settings
 */
export function getSecurityConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    ...SECURITY_CONFIG,

    // Adjust settings based on environment
    RATE_LIMITS: {
      ...SECURITY_CONFIG.RATE_LIMITS,
      // More lenient rate limits in development
      ...(isDevelopment && {
        DEFAULT: { requests: 1000, windowMs: 60 * 1000 },
        AUTH: { requests: 100, windowMs: 60 * 1000 },
        API: { requests: 2000, windowMs: 60 * 1000 },
      }),
    },

    // HTTPS enforcement only in production
    FORCE_HTTPS: isProduction,

    // More strict CSP in production
    CSP: {
      ...SECURITY_CONFIG.CSP,
      ...(isProduction && {
        SCRIPT_SRC: ["'self'"], // Remove unsafe-inline and unsafe-eval in production
      }),
    },

    // Audit logging
    AUDIT_LOG: {
      ...SECURITY_CONFIG.AUDIT_LOG,
      ENABLED: isProduction || process.env.ENABLE_AUDIT_LOG === 'true',
    },
  };
}
