/**
 * Tests for authentication configuration and utilities
 */

import {
  validatePassword,
  validateEmail,
  AUTH_CONFIG,
} from '@/lib/auth-config';

describe('Authentication Configuration', () => {
  describe('validatePassword', () => {
    it('should validate password length', () => {
      const shortPassword = '1234567';
      const validPassword = 'Password123'; // Meets all requirements

      expect(validatePassword(shortPassword).isValid).toBe(false);
      expect(validatePassword(shortPassword).errors).toContain(
        `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`
      );

      expect(validatePassword(validPassword).isValid).toBe(true);
      expect(validatePassword(validPassword).errors).toHaveLength(0);
    });

    it('should validate uppercase requirement when enabled', () => {
      if (AUTH_CONFIG.PASSWORD_REQUIRE_UPPERCASE) {
        const noUppercase = 'password123';
        const withUppercase = 'Password123';

        expect(validatePassword(noUppercase).isValid).toBe(false);
        expect(validatePassword(noUppercase).errors).toContain(
          'Password must contain at least one uppercase letter'
        );

        expect(validatePassword(withUppercase).isValid).toBe(true);
      }
    });

    it('should validate lowercase requirement when enabled', () => {
      if (AUTH_CONFIG.PASSWORD_REQUIRE_LOWERCASE) {
        const noLowercase = 'PASSWORD123';
        const withLowercase = 'Password123';

        expect(validatePassword(noLowercase).isValid).toBe(false);
        expect(validatePassword(noLowercase).errors).toContain(
          'Password must contain at least one lowercase letter'
        );

        expect(validatePassword(withLowercase).isValid).toBe(true);
      }
    });

    it('should validate number requirement when enabled', () => {
      if (AUTH_CONFIG.PASSWORD_REQUIRE_NUMBERS) {
        const noNumbers = 'Password';
        const withNumbers = 'Password123';

        expect(validatePassword(noNumbers).isValid).toBe(false);
        expect(validatePassword(noNumbers).errors).toContain(
          'Password must contain at least one number'
        );

        expect(validatePassword(withNumbers).isValid).toBe(true);
      }
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
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        { email: 'invalid-email', reason: 'no @ symbol' },
        { email: '@example.com', reason: 'no local part' },
        { email: 'user@', reason: 'no domain' },
        { email: 'user@.com', reason: 'domain starts with dot' },
        { email: 'user@domain', reason: 'no TLD' },
        { email: 'user space@example.com', reason: 'space in local part' },
      ];

      invalidEmails.forEach(({ email, reason }) => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('AUTH_CONFIG constants', () => {
    it('should have required configuration values', () => {
      expect(AUTH_CONFIG.SESSION_MAX_AGE).toBeGreaterThan(0);
      expect(AUTH_CONFIG.JWT_MAX_AGE).toBeGreaterThan(0);
      expect(AUTH_CONFIG.PASSWORD_MIN_LENGTH).toBeGreaterThan(0);
      expect(AUTH_CONFIG.EMAIL_REGEX).toBeInstanceOf(RegExp);
    });

    it('should have all required routes defined', () => {
      expect(AUTH_CONFIG.ROUTES.SIGNIN).toBeDefined();
      expect(AUTH_CONFIG.ROUTES.SIGNUP).toBeDefined();
      expect(AUTH_CONFIG.ROUTES.DASHBOARD).toBeDefined();
      expect(AUTH_CONFIG.ROUTES.UNAUTHORIZED).toBeDefined();
    });
  });
});
