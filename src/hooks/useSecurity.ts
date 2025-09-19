/**
 * React hooks for security features
 */

import { useEffect, useCallback } from 'react';
import {
  getCSRFToken,
  secureFetch,
  initializeClientSecurity,
} from '@/lib/client-security';

/**
 * Hook for secure API calls with CSRF protection
 */
export function useSecureFetch() {
  const secureApiCall = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        return await secureFetch(url, options);
      } catch (error) {
        console.error('Secure fetch error:', error);
        throw error;
      }
    },
    []
  );

  return { secureApiCall };
}

/**
 * Hook for CSRF token management
 */
export function useCSRFToken() {
  const getToken = useCallback(() => {
    return getCSRFToken();
  }, []);

  const isTokenValid = useCallback(() => {
    const token = getCSRFToken();
    return token !== null && token.length > 0;
  }, []);

  return { getToken, isTokenValid };
}

/**
 * Hook for input sanitization
 */
export function useInputSanitization() {
  const sanitizeString = useCallback(
    (input: string, maxLength?: number): string => {
      // Basic client-side sanitization
      let sanitized = input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();

      if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
      }

      return sanitized;
    },
    []
  );

  const validateInput = useCallback(
    (
      input: string,
      rules: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
      } = {}
    ): { isValid: boolean; error?: string } => {
      const { required = false, minLength, maxLength, pattern } = rules;

      if (required && !input.trim()) {
        return { isValid: false, error: '此字段为必填项' };
      }

      if (!input.trim() && !required) {
        return { isValid: true };
      }

      if (minLength && input.length < minLength) {
        return { isValid: false, error: `至少需要${minLength}个字符` };
      }

      if (maxLength && input.length > maxLength) {
        return { isValid: false, error: `不能超过${maxLength}个字符` };
      }

      if (pattern && !pattern.test(input)) {
        return { isValid: false, error: '格式不正确' };
      }

      // Check for dangerous patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
          return { isValid: false, error: '输入内容包含不允许的字符' };
        }
      }

      return { isValid: true };
    },
    []
  );

  return { sanitizeString, validateInput };
}

/**
 * Hook for form security validation
 */
export function useFormSecurity() {
  const { sanitizeString, validateInput } = useInputSanitization();
  const { secureApiCall } = useSecureFetch();

  const validateForm = useCallback(
    (
      formData: Record<string, any>,
      validationRules: Record<
        string,
        {
          required?: boolean;
          minLength?: number;
          maxLength?: number;
          pattern?: RegExp;
        }
      > = {}
    ): { isValid: boolean; errors: Record<string, string> } => {
      const errors: Record<string, string> = {};

      Object.entries(formData).forEach(([field, value]) => {
        if (typeof value === 'string') {
          const rules = validationRules[field] || {};
          const validation = validateInput(value, rules);

          if (!validation.isValid && validation.error) {
            errors[field] = validation.error;
          }
        }
      });

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      };
    },
    [validateInput]
  );

  const sanitizeFormData = useCallback(
    (
      formData: Record<string, any>,
      fieldLimits: Record<string, number> = {}
    ): Record<string, any> => {
      const sanitized: Record<string, any> = {};

      Object.entries(formData).forEach(([field, value]) => {
        if (typeof value === 'string') {
          const maxLength = fieldLimits[field];
          sanitized[field] = sanitizeString(value, maxLength);
        } else {
          sanitized[field] = value;
        }
      });

      return sanitized;
    },
    [sanitizeString]
  );

  const submitSecureForm = useCallback(
    async (
      url: string,
      formData: Record<string, any>,
      options: RequestInit = {}
    ) => {
      const response = await secureApiCall(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(formData),
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Request failed');
      }

      return response.json();
    },
    [secureApiCall]
  );

  return {
    validateForm,
    sanitizeFormData,
    submitSecureForm,
  };
}

/**
 * Hook for security monitoring and reporting
 */
export function useSecurityMonitoring() {
  const reportSecurityEvent = useCallback(
    (eventType: string, details: Record<string, any> = {}) => {
      // Log security events for monitoring
      console.warn(`[SECURITY] ${eventType}:`, details);

      // In production, you might want to send this to your monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Report to monitoring service
        fetch('/api/security/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: eventType,
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          }),
        }).catch(console.error);
      }
    },
    []
  );

  const reportCSPViolation = useCallback(
    (violation: SecurityPolicyViolationEvent) => {
      reportSecurityEvent('csp_violation', {
        blockedURI: violation.blockedURI,
        violatedDirective: violation.violatedDirective,
        sourceFile: violation.sourceFile,
        lineNumber: violation.lineNumber,
      });
    },
    [reportSecurityEvent]
  );

  const reportSuspiciousActivity = useCallback(
    (activity: string, context: Record<string, any> = {}) => {
      reportSecurityEvent('suspicious_activity', {
        activity,
        ...context,
      });
    },
    [reportSecurityEvent]
  );

  return {
    reportSecurityEvent,
    reportCSPViolation,
    reportSuspiciousActivity,
  };
}

/**
 * Hook to initialize client-side security features
 */
export function useSecurityInitialization() {
  useEffect(() => {
    initializeClientSecurity();
  }, []);
}
