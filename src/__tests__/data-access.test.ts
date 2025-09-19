// DynamoDB 数据访问层测试

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  validateData,
  userValidation,
  teamValidation,
  eventValidation,
} from '../lib/data-validation';
import {
  idUtils,
  dateUtils,
  sanitizeData,
  permissionUtils,
} from '../lib/data-validation';
import { DynamoDBError, ERROR_CODES } from '../lib/dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: jest.fn(),
    })),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
  QueryCommand: jest.fn(),
}));

describe('数据验证工具', () => {
  describe('用户数据验证', () => {
    it('应该验证有效的用户创建数据', () => {
      const validData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() =>
        validateData(userValidation.create, validData)
      ).not.toThrow();
    });

    it('应该拒绝无效的邮箱格式', () => {
      const invalidData = {
        email: 'invalid-email',
        name: 'Test User',
      };

      expect(() => validateData(userValidation.create, invalidData)).toThrow(
        DynamoDBError
      );
    });

    it('应该拒绝空的用户名', () => {
      const invalidData = {
        email: 'test@example.com',
        name: '',
      };

      expect(() => validateData(userValidation.create, invalidData)).toThrow(
        DynamoDBError
      );
    });
  });

  describe('团队数据验证', () => {
    it('应该验证有效的团队创建数据', () => {
      const validData = {
        name: 'Test Team',
        description: 'A test team',
        ownerId: 'user123',
      };

      expect(() =>
        validateData(teamValidation.create, validData)
      ).not.toThrow();
    });

    it('应该允许可选的描述字段', () => {
      const validData = {
        name: 'Test Team',
        ownerId: 'user123',
      };

      expect(() =>
        validateData(teamValidation.create, validData)
      ).not.toThrow();
    });
  });

  describe('事件数据验证', () => {
    it('应该验证有效的事件创建数据', () => {
      const validData = {
        teamId: 'team123',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        isAllDay: false,
        category: 'meeting' as const,
        color: '#FF0000',
        createdBy: 'user123',
      };

      expect(() =>
        validateData(eventValidation.create, validData)
      ).not.toThrow();
    });

    it('应该拒绝结束时间早于开始时间的事件', () => {
      const invalidData = {
        teamId: 'team123',
        title: 'Test Event',
        startTime: '2024-01-01T11:00:00Z',
        endTime: '2024-01-01T10:00:00Z',
        isAllDay: false,
        category: 'meeting' as const,
        color: '#FF0000',
        createdBy: 'user123',
      };

      expect(() => validateData(eventValidation.create, invalidData)).toThrow(
        DynamoDBError
      );
    });

    it('应该拒绝无效的颜色格式', () => {
      const invalidData = {
        teamId: 'team123',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        isAllDay: false,
        category: 'meeting' as const,
        color: 'invalid-color',
        createdBy: 'user123',
      };

      expect(() => validateData(eventValidation.create, invalidData)).toThrow(
        DynamoDBError
      );
    });
  });
});

describe('工具函数', () => {
  describe('ID 工具', () => {
    it('应该生成有效的ID', () => {
      const id = idUtils.generate();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(idUtils.validate(id)).toBe(true);
    });

    it('应该验证有效的ID格式', () => {
      expect(idUtils.validate('valid-id-123')).toBe(true);
      expect(idUtils.validate('invalid id')).toBe(false);
      expect(idUtils.validate('')).toBe(false);
      expect(idUtils.validate('a')).toBe(false); // 太短
    });

    it('应该生成订阅密钥', () => {
      const key = idUtils.generateSubscriptionKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(32);
    });
  });

  describe('日期工具', () => {
    it('应该格式化日期为 YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = dateUtils.formatDate(date);
      expect(formatted).toBe('2024-01-15');
    });

    it('应该验证有效的日期字符串', () => {
      expect(dateUtils.isValidDate('2024-01-15T10:30:00Z')).toBe(true);
      expect(dateUtils.isValidDate('invalid-date')).toBe(false);
    });

    it('应该生成日期范围', () => {
      const range = dateUtils.getDateRange('2024-01-01', '2024-01-03');
      expect(range).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    });
  });

  describe('数据清理', () => {
    it('应该清理字符串', () => {
      expect(sanitizeData.string('  test  string  ')).toBe('test string');
      expect(sanitizeData.string('multiple   spaces')).toBe('multiple spaces');
    });

    it('应该清理邮箱', () => {
      expect(sanitizeData.email('  TEST@EXAMPLE.COM  ')).toBe(
        'test@example.com'
      );
    });

    it('应该清理HTML内容', () => {
      const html = '<script>alert("xss")</script><p>Safe content</p>';
      const cleaned = sanitizeData.html(html);
      expect(cleaned).toBe('Safe content');
      expect(cleaned).not.toContain('<script>');
    });

    it('应该清理颜色值', () => {
      expect(sanitizeData.color('ff0000')).toBe('#FF0000');
      expect(sanitizeData.color('#ff0000')).toBe('#FF0000');
      expect(sanitizeData.color('  #ff0000  ')).toBe('#FF0000');
    });
  });

  describe('权限工具', () => {
    it('应该正确检查事件编辑权限', () => {
      expect(permissionUtils.canEditEvent('owner', 'user1', 'user2')).toBe(
        true
      );
      expect(permissionUtils.canEditEvent('member', 'user1', 'user1')).toBe(
        true
      );
      expect(permissionUtils.canEditEvent('member', 'user1', 'user2')).toBe(
        false
      );
      expect(permissionUtils.canEditEvent('viewer', 'user1', 'user1')).toBe(
        false
      );
    });

    it('应该正确检查团队管理权限', () => {
      expect(permissionUtils.canManageTeam('owner')).toBe(true);
      expect(permissionUtils.canManageTeam('member')).toBe(false);
      expect(permissionUtils.canManageTeam('viewer')).toBe(false);
    });

    it('应该正确检查成员邀请权限', () => {
      expect(permissionUtils.canInviteMembers('owner')).toBe(true);
      expect(permissionUtils.canInviteMembers('member')).toBe(true);
      expect(permissionUtils.canInviteMembers('viewer')).toBe(false);
    });

    it('应该正确检查团队查看权限', () => {
      expect(permissionUtils.canViewTeam('owner')).toBe(true);
      expect(permissionUtils.canViewTeam('member')).toBe(true);
      expect(permissionUtils.canViewTeam('viewer')).toBe(true);
      expect(permissionUtils.canViewTeam('invalid')).toBe(false);
    });
  });
});

describe('错误处理', () => {
  it('应该创建带有正确属性的 DynamoDBError', () => {
    const error = new DynamoDBError(
      'Test error',
      ERROR_CODES.VALIDATION_ERROR,
      400
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('DynamoDBError');
  });

  it('应该有默认的状态码', () => {
    const error = new DynamoDBError('Test error', ERROR_CODES.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
  });
});
