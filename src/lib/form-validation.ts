/**
 * Form validation utilities
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string;
}

export class FormValidator {
  private rules: ValidationRules;

  constructor(rules: ValidationRules) {
    this.rules = rules;
  }

  validate(data: Record<string, any>): ValidationErrors {
    const errors: ValidationErrors = {};

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      const error = this.validateField(field, value, rule);
      if (error) {
        errors[field] = error;
      }
    }

    return errors;
  }

  validateField(
    field: string,
    value: any,
    rule: ValidationRule
  ): string | null {
    const stringValue = String(value || '');

    // Required validation
    if (rule.required && !stringValue.trim()) {
      return `${this.getFieldDisplayName(field)}是必填项`;
    }

    // Skip other validations if field is empty and not required
    if (!stringValue.trim() && !rule.required) {
      return null;
    }

    // Min length validation
    if (rule.minLength && stringValue.length < rule.minLength) {
      return `${this.getFieldDisplayName(field)}至少需要${rule.minLength}个字符`;
    }

    // Max length validation
    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return `${this.getFieldDisplayName(field)}不能超过${rule.maxLength}个字符`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return `${this.getFieldDisplayName(field)}格式不正确`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(stringValue);
    }

    return null;
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      email: '邮箱',
      password: '密码',
      name: '姓名',
      confirmPassword: '确认密码',
      title: '标题',
      description: '描述',
      teamName: '团队名称',
    };

    return fieldNames[field] || field;
  }
}

// Common validation rules
export const commonRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  teamName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
};

// Validation helper functions
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return '密码至少需要8个字符';
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return '密码必须包含至少一个小写字母';
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return '密码必须包含至少一个大写字母';
  }
  if (!/(?=.*\d)/.test(password)) {
    return '密码必须包含至少一个数字';
  }
  return null;
};

export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): string | null => {
  if (password !== confirmPassword) {
    return '两次输入的密码不一致';
  }
  return null;
};
