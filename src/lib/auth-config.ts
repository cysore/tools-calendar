/**
 * Authentication configuration and constants
 */

export const AUTH_CONFIG = {
  // Session configuration
  SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  JWT_MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds

  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SPECIAL: false,

  // Rate limiting
  LOGIN_ATTEMPTS_LIMIT: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60, // 15 minutes in seconds

  // Email validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Routes
  ROUTES: {
    SIGNIN: '/auth/signin',
    SIGNUP: '/auth/signup',
    RESET_PASSWORD: '/auth/reset-password',
    DASHBOARD: '/dashboard',
    UNAUTHORIZED: '/unauthorized',
    ERROR: '/auth/error',
  },

  // AWS Cognito configuration
  COGNITO: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET,
    ISSUER: process.env.COGNITO_ISSUER,
  },

  // DynamoDB configuration
  DYNAMODB: {
    REGION: process.env.AWS_REGION || 'us-east-1',
    TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'team-calendar-auth',
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  },
} as const;

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(
      `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`
    );
  }

  if (AUTH_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (AUTH_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (AUTH_CONFIG.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    AUTH_CONFIG.PASSWORD_REQUIRE_SPECIAL &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return AUTH_CONFIG.EMAIL_REGEX.test(email);
}

/**
 * Get environment-specific configuration
 */
export function getAuthEnvironment() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    isDevelopment,
    isProduction,
    debug: isDevelopment,
    secure: isProduction,
  };
}

/**
 * Validate required environment variables
 */
export function validateAuthEnvironment(): {
  isValid: boolean;
  missingVars: string[];
} {
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'COGNITO_CLIENT_ID',
    'COGNITO_CLIENT_SECRET',
    'COGNITO_ISSUER',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
