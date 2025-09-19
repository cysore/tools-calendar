/**
 * Client-side security utilities
 */

/**
 * Get CSRF token from cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Create secure fetch wrapper with CSRF protection
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCSRFToken();

  const secureOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    credentials: 'same-origin',
  };

  // Add security headers for requests
  if (!secureOptions.headers) {
    secureOptions.headers = {};
  }

  const response = await fetch(url, secureOptions);

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
  }

  // Handle CSRF errors
  if (response.status === 403) {
    const errorText = await response.text();
    if (errorText.includes('CSRF')) {
      // Refresh the page to get a new CSRF token
      window.location.reload();
      throw new Error('CSRF token expired. Page will refresh.');
    }
  }

  return response;
}

/**
 * Sanitize user input on the client side
 */
export function sanitizeInput(input: string): string {
  // Basic client-side sanitization
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format on client side
 */
export function validateEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码至少需要8个字符');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Secure local storage wrapper
 */
export class SecureStorage {
  private static readonly PREFIX = 'secure_';

  /**
   * Store data securely in localStorage
   */
  static setItem(key: string, value: any): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const encoded = btoa(serialized); // Basic encoding (not encryption)
      localStorage.setItem(SecureStorage.PREFIX + key, encoded);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  }

  /**
   * Retrieve data securely from localStorage
   */
  static getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const encoded = localStorage.getItem(SecureStorage.PREFIX + key);
      if (!encoded) {
        return null;
      }

      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  }

  /**
   * Remove data from secure storage
   */
  static removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(SecureStorage.PREFIX + key);
  }

  /**
   * Clear all secure storage data
   */
  static clear(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(SecureStorage.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Content Security Policy violation reporter
 */
export function setupCSPReporting(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', event => {
    console.warn('CSP Violation:', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
    });

    // In production, you might want to report this to your logging service
    if (process.env.NODE_ENV === 'production') {
      // Report CSP violation to your monitoring service
      fetch('/api/security/csp-violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
        }),
      }).catch(console.error);
    }
  });
}

/**
 * Initialize client-side security features
 */
export function initializeClientSecurity(): void {
  setupCSPReporting();

  // Clear any potentially stale security data on page load
  if (typeof window !== 'undefined') {
    // Clear old CSRF tokens on navigation
    window.addEventListener('beforeunload', () => {
      // Don't clear CSRF token on beforeunload as it's needed for the next request
    });
  }
}
