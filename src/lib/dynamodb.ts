// DynamoDB 客户端配置和连接

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB 客户端配置
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// 文档客户端，用于简化 JSON 操作
export const docClient = DynamoDBDocumentClient.from(client);

// 表名配置
export const TABLE_NAMES = {
  MAIN: process.env.DYNAMODB_TABLE_NAME || 'team-calendar-sync',
} as const;

// GSI 索引名称
export const GSI_NAMES = {
  GSI1: 'GSI1',
} as const;

// 分区键和排序键前缀
export const KEY_PREFIXES = {
  USER: 'USER#',
  TEAM: 'TEAM#',
  MEMBER: 'MEMBER#',
  EVENT: 'EVENT#',
  EMAIL: 'EMAIL#',
  DATE: 'DATE#',
} as const;

// 生成键的辅助函数
export const generateKeys = {
  user: (userId: string) => ({
    PK: `${KEY_PREFIXES.USER}${userId}`,
    SK: `${KEY_PREFIXES.USER}${userId}`,
    GSI1PK: `${KEY_PREFIXES.EMAIL}`,
    GSI1SK: `${KEY_PREFIXES.USER}${userId}`,
  }),

  userByEmail: (email: string, userId: string) => ({
    GSI1PK: `${KEY_PREFIXES.EMAIL}${email}`,
    GSI1SK: `${KEY_PREFIXES.USER}${userId}`,
  }),

  team: (teamId: string) => ({
    PK: `${KEY_PREFIXES.TEAM}${teamId}`,
    SK: `${KEY_PREFIXES.TEAM}${teamId}`,
  }),

  teamMember: (teamId: string, userId: string) => ({
    PK: `${KEY_PREFIXES.TEAM}${teamId}`,
    SK: `${KEY_PREFIXES.MEMBER}${userId}`,
    GSI1PK: `${KEY_PREFIXES.USER}${userId}`,
    GSI1SK: `${KEY_PREFIXES.TEAM}${teamId}`,
  }),

  event: (teamId: string, eventId: string, date: string) => ({
    PK: `${KEY_PREFIXES.TEAM}${teamId}`,
    SK: `${KEY_PREFIXES.EVENT}${eventId}`,
    GSI1PK: `${KEY_PREFIXES.DATE}${date}`,
    GSI1SK: `${KEY_PREFIXES.TEAM}${teamId}#${KEY_PREFIXES.EVENT}${eventId}`,
  }),
};

// 错误处理类型
export class DynamoDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'DynamoDBError';
  }
}

// 常见错误代码
export const ERROR_CODES = {
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
