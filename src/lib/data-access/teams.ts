// 团队数据访问层

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  docClient,
  TABLE_NAMES,
  generateKeys,
  DynamoDBError,
  ERROR_CODES,
} from '../dynamodb';
import { Team, CreateTeamData, UpdateTeamData } from '../../types/database';
import {
  validateData,
  teamValidation,
  sanitizeData,
  idUtils,
  dateUtils,
} from '../data-validation';

export class TeamRepository {
  // 创建团队
  static async create(teamData: CreateTeamData): Promise<Team> {
    const validatedData = validateData(teamValidation.create, teamData);

    const teamId = idUtils.generate();
    const now = dateUtils.now();
    const subscriptionKey = idUtils.generateSubscriptionKey();

    const keys = generateKeys.team(teamId);

    const team: Team = {
      ...keys,
      teamId,
      name: sanitizeData.string(validatedData.name),
      description: validatedData.description
        ? sanitizeData.string(validatedData.description)
        : undefined,
      ownerId: validatedData.ownerId,
      subscriptionKey,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.MAIN,
          Item: team,
          ConditionExpression: 'attribute_not_exists(PK)',
        })
      );

      return team;
    } catch (error) {
      throw new DynamoDBError('创建团队失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 根据团队ID获取团队
  static async findById(teamId: string): Promise<Team | null> {
    if (!idUtils.validate(teamId)) {
      throw new DynamoDBError(
        '无效的团队ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const keys = generateKeys.team(teamId);
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
        })
      );

      return (result.Item as Team) || null;
    } catch (error) {
      throw new DynamoDBError('获取团队失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 更新团队信息
  static async update(
    teamId: string,
    updateData: UpdateTeamData
  ): Promise<Team> {
    const validatedData = validateData(teamValidation.update, updateData);

    if (!idUtils.validate(teamId)) {
      throw new DynamoDBError(
        '无效的团队ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.team(teamId);
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

    if (validatedData.description !== undefined) {
      if (
        validatedData.description === null ||
        validatedData.description === ''
      ) {
        updateExpressions.push('description = :description');
        expressionAttributeValues[':description'] = null;
      } else {
        updateExpressions.push('description = :description');
        expressionAttributeValues[':description'] = sanitizeData.string(
          validatedData.description
        );
      }
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

      return result.Attributes as Team;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('团队不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError('更新团队失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 重新生成订阅密钥
  static async regenerateSubscriptionKey(teamId: string): Promise<string> {
    if (!idUtils.validate(teamId)) {
      throw new DynamoDBError(
        '无效的团队ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.team(teamId);
    const newSubscriptionKey = idUtils.generateSubscriptionKey();
    const now = dateUtils.now();

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
          UpdateExpression:
            'SET subscriptionKey = :subscriptionKey, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':subscriptionKey': newSubscriptionKey,
            ':updatedAt': now,
          },
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return newSubscriptionKey;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('团队不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError(
        '重新生成订阅密钥失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 删除团队
  static async delete(teamId: string): Promise<void> {
    if (!idUtils.validate(teamId)) {
      throw new DynamoDBError(
        '无效的团队ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.team(teamId);

    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('团队不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError('删除团队失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 验证团队是否存在
  static async exists(teamId: string): Promise<boolean> {
    const team = await this.findById(teamId);
    return team !== null;
  }

  // 根据订阅密钥获取团队
  static async findBySubscriptionKey(
    subscriptionKey: string
  ): Promise<Team | null> {
    // 注意：这个查询需要扫描表，在生产环境中应该考虑添加GSI
    // 这里提供基础实现，实际使用时建议优化
    throw new DynamoDBError(
      '根据订阅密钥查找团队功能需要额外的GSI支持',
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

// Type conversion functions
function convertDatabaseTeamToApiTeam(dbTeam: Team): import('@/types').Team {
  return {
    id: dbTeam.teamId,
    name: dbTeam.name,
    description: dbTeam.description,
    ownerId: dbTeam.ownerId,
    subscriptionKey: dbTeam.subscriptionKey,
    createdAt: dbTeam.createdAt,
    updatedAt: dbTeam.updatedAt,
  };
}

// Wrapper functions for easier API usage
export async function getTeamById(
  teamId: string
): Promise<import('@/types').Team | null> {
  const dbTeam = await TeamRepository.findById(teamId);
  return dbTeam ? convertDatabaseTeamToApiTeam(dbTeam) : null;
}

export async function updateTeam(
  teamId: string,
  updateData: UpdateTeamData
): Promise<import('@/types').Team> {
  const dbTeam = await TeamRepository.update(teamId, updateData);
  return convertDatabaseTeamToApiTeam(dbTeam);
}
