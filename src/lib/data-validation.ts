// 数据验证和清理工具函数

import { z } from 'zod';
import { DynamoDBError, ERROR_CODES } from './dynamodb';

// 基础验证模式
const emailSchema = z.string().email('无效的邮箱格式');
const nameSchema = z.string().min(1, '名称不能为空').max(100, '名称过长');
const descriptionSchema = z.string().max(500, '描述过长').optional();
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, '无效的颜色格式');
const dateTimeSchema = z.string().datetime('无效的日期时间格式');
const roleSchema = z.enum(['owner', 'member', 'viewer'], {
  message: '无效的角色类型',
});
const categorySchema = z.enum(['meeting', 'task', 'reminder'], {
  message: '无效的事件分类',
});

// 用户数据验证
export const userValidation = {
  create: z.object({
    email: emailSchema,
    name: nameSchema,
  }),

  update: z.object({
    name: nameSchema.optional(),
  }),
};

// 团队数据验证
export const teamValidation = {
  create: z.object({
    name: nameSchema,
    description: descriptionSchema,
    ownerId: z.string().min(1, '所有者ID不能为空'),
  }),

  update: z.object({
    name: nameSchema.optional(),
    description: descriptionSchema,
  }),
};

// 团队成员数据验证
export const teamMemberValidation = {
  create: z.object({
    teamId: z.string().min(1, '团队ID不能为空'),
    userId: z.string().min(1, '用户ID不能为空'),
    role: roleSchema,
  }),

  updateRole: z.object({
    role: roleSchema,
  }),
};

// 事件数据验证
export const eventValidation = {
  create: z
    .object({
      teamId: z.string().min(1, '团队ID不能为空'),
      title: z.string().min(1, '标题不能为空').max(200, '标题过长'),
      startTime: dateTimeSchema,
      endTime: dateTimeSchema,
      isAllDay: z.boolean(),
      location: z.string().max(200, '地点过长').optional(),
      description: z.string().max(1000, '描述过长').optional(),
      category: categorySchema,
      color: colorSchema,
      createdBy: z.string().min(1, '创建者ID不能为空'),
    })
    .refine(data => new Date(data.startTime) < new Date(data.endTime), {
      message: '结束时间必须晚于开始时间',
      path: ['endTime'],
    }),

  update: z
    .object({
      title: z.string().min(1, '标题不能为空').max(200, '标题过长').optional(),
      startTime: dateTimeSchema.optional(),
      endTime: dateTimeSchema.optional(),
      isAllDay: z.boolean().optional(),
      location: z.string().max(200, '地点过长').optional(),
      description: z.string().max(1000, '描述过长').optional(),
      category: categorySchema.optional(),
      color: colorSchema.optional(),
    })
    .refine(
      data => {
        if (data.startTime && data.endTime) {
          return new Date(data.startTime) < new Date(data.endTime);
        }
        return true;
      },
      {
        message: '结束时间必须晚于开始时间',
        path: ['endTime'],
      }
    ),
};

// 通用验证函数
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        error.issues
          ?.map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ') || '验证失败';
      throw new DynamoDBError(
        `数据验证失败: ${errorMessage}`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    throw error;
  }
}

// 数据清理函数
export const sanitizeData = {
  // 清理字符串，移除多余空格和特殊字符
  string: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  // 清理邮箱，转换为小写
  email: (email: string): string => {
    return email.trim().toLowerCase();
  },

  // 清理HTML内容，防止XSS
  html: (content: string): string => {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  // 清理颜色值，确保格式正确
  color: (color: string): string => {
    const cleaned = color.trim().toUpperCase();
    if (cleaned.startsWith('#')) {
      return cleaned;
    }
    return `#${cleaned}`;
  },
};

// ID 生成和验证
export const idUtils = {
  // 生成唯一ID
  generate: (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // 验证ID格式
  validate: (id: string): boolean => {
    return /^[a-zA-Z0-9\-_]+$/.test(id) && id.length >= 3 && id.length <= 50;
  },

  // 生成订阅密钥
  generateSubscriptionKey: (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 生成邀请令牌
  generateInvitationToken: (): string => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 48; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

// 日期工具函数
export const dateUtils = {
  // 获取ISO格式的当前时间
  now: (): string => {
    return new Date().toISOString();
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  },

  // 验证日期字符串
  isValidDate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  // 获取日期范围内的所有日期
  getDateRange: (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(dateUtils.formatDate(d));
    }

    return dates;
  },
};

// 权限验证函数 - 已迁移到 @/lib/permissions
// 为了向后兼容，保留这些函数但使用新的权限系统
import {
  canEditEvent,
  canManageTeamSettings,
  canInviteMembers,
  hasPermission,
} from './permissions';
import { Permission } from './permissions';
import { UserRole } from '@/types/auth';

export const permissionUtils = {
  // 检查用户是否有权限执行操作
  canEditEvent: (
    userRole: string,
    eventCreatedBy: string,
    userId: string
  ): boolean => {
    return canEditEvent(userRole as UserRole, eventCreatedBy, userId);
  },

  // 检查用户是否有权限管理团队
  canManageTeam: (userRole: string): boolean => {
    return canManageTeamSettings(userRole as UserRole);
  },

  // 检查用户是否有权限邀请成员
  canInviteMembers: (userRole: string): boolean => {
    return canInviteMembers(userRole as UserRole);
  },

  // 检查用户是否有权限查看团队
  canViewTeam: (userRole: string): boolean => {
    return ['owner', 'member', 'viewer'].includes(userRole);
  },
};
