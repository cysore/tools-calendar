// 用户数据访问层

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  docClient,
  TABLE_NAMES,
  generateKeys,
  DynamoDBError,
  ERROR_CODES,
} from '../dynamodb';
import { User, CreateUserData } from '../../types/database';
import {
  validateData,
  userValidation,
  sanitizeData,
  idUtils,
  dateUtils,
} from '../data-validation';

export class UserRepository {
  // 创建用户
  static async create(userData: CreateUserData): Promise<User> {
    const validatedData = validateData(userValidation.create, userData);

    const userId = idUtils.generate();
    const now = dateUtils.now();
    const cleanEmail = sanitizeData.email(validatedData.email);
    const cleanName = sanitizeData.string(validatedData.name);

    const userKeys = generateKeys.user(userId);
    const emailKeys = generateKeys.userByEmail(cleanEmail, userId);

    const user: User = {
      ...userKeys,
      ...emailKeys,
      userId,
      email: cleanEmail,
      name: cleanName,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // 检查邮箱是否已存在
      const existingUser = await this.findByEmail(cleanEmail);
      if (existingUser) {
        throw new DynamoDBError(
          '邮箱已被使用',
          ERROR_CODES.DUPLICATE_ITEM,
          409
        );
      }

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.MAIN,
          Item: user,
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );

      return user;
    } catch (error) {
      if (error instanceof DynamoDBError) {
        throw error;
      }
      throw new DynamoDBError('创建用户失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 根据用户ID获取用户
  static async findById(userId: string): Promise<User | null> {
    if (!idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const keys = generateKeys.user(userId);
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
        })
      );

      return (result.Item as User) || null;
    } catch (error) {
      throw new DynamoDBError('获取用户失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 根据邮箱获取用户
  static async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = sanitizeData.email(email);

    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.MAIN,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :gsi1pk',
          ExpressionAttributeValues: {
            ':gsi1pk': `EMAIL#${cleanEmail}`,
          },
          Limit: 1,
        })
      );

      return (result.Items?.[0] as User) || null;
    } catch (error) {
      throw new DynamoDBError(
        '根据邮箱查找用户失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 更新用户信息
  static async update(
    userId: string,
    updateData: { name?: string }
  ): Promise<User> {
    const validatedData = validateData(userValidation.update, updateData);

    if (!idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.user(userId);
    const now = dateUtils.now();

    // 构建更新表达式
    const updateExpressions: string[] = ['updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now,
    };

    if (validatedData.name !== undefined) {
      updateExpressions.push('name = :name');
      expressionAttributeValues[':name'] = sanitizeData.string(
        validatedData.name
      );
    }

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as User;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('用户不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError('更新用户失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 删除用户（软删除，实际项目中可能需要保留数据）
  static async delete(userId: string): Promise<void> {
    if (!idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // 注意：在实际应用中，删除用户需要考虑级联删除相关数据
    // 这里只是示例实现
    throw new DynamoDBError('用户删除功能暂未实现', ERROR_CODES.INTERNAL_ERROR);
  }

  // 验证用户是否存在
  static async exists(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user !== null;
  }
}
