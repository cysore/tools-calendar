// 团队成员数据访问层

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  docClient,
  TABLE_NAMES,
  generateKeys,
  DynamoDBError,
  ERROR_CODES,
  GSI_NAMES,
} from '../dynamodb';
import {
  TeamMember,
  CreateTeamMemberData,
  GetTeamMembersParams,
  GetUserTeamsParams,
} from '../../types/database';
import {
  validateData,
  teamMemberValidation,
  idUtils,
  dateUtils,
} from '../data-validation';

export class TeamMemberRepository {
  // 添加团队成员
  static async create(memberData: CreateTeamMemberData): Promise<TeamMember> {
    const validatedData = validateData(teamMemberValidation.create, memberData);

    const now = dateUtils.now();
    const keys = generateKeys.teamMember(
      validatedData.teamId,
      validatedData.userId
    );

    const teamMember: TeamMember = {
      ...keys,
      teamId: validatedData.teamId,
      userId: validatedData.userId,
      role: validatedData.role,
      joinedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.MAIN,
          Item: teamMember,
          ConditionExpression:
            'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        })
      );

      return teamMember;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError(
          '用户已是团队成员',
          ERROR_CODES.DUPLICATE_ITEM,
          409
        );
      }
      throw new DynamoDBError('添加团队成员失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 获取团队成员
  static async findByTeamAndUser(
    teamId: string,
    userId: string
  ): Promise<TeamMember | null> {
    if (!idUtils.validate(teamId) || !idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的团队ID或用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const keys = generateKeys.teamMember(teamId, userId);
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
        })
      );

      return (result.Item as TeamMember) || null;
    } catch (error) {
      throw new DynamoDBError('获取团队成员失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 获取团队所有成员
  static async findByTeam(params: GetTeamMembersParams): Promise<TeamMember[]> {
    if (!idUtils.validate(params.teamId)) {
      throw new DynamoDBError(
        '无效的团队ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.MAIN,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `TEAM#${params.teamId}`,
            ':sk': 'MEMBER#',
          },
        })
      );

      return (result.Items as TeamMember[]) || [];
    } catch (error) {
      throw new DynamoDBError(
        '获取团队成员列表失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 获取用户所属的所有团队
  static async findByUser(params: GetUserTeamsParams): Promise<TeamMember[]> {
    if (!idUtils.validate(params.userId)) {
      throw new DynamoDBError(
        '无效的用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.MAIN,
          IndexName: GSI_NAMES.GSI1,
          KeyConditionExpression:
            'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
          ExpressionAttributeValues: {
            ':gsi1pk': `USER#${params.userId}`,
            ':gsi1sk': 'TEAM#',
          },
        })
      );

      return (result.Items as TeamMember[]) || [];
    } catch (error) {
      throw new DynamoDBError(
        '获取用户团队列表失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 更新成员角色
  static async updateRole(
    teamId: string,
    userId: string,
    role: 'owner' | 'member' | 'viewer'
  ): Promise<TeamMember> {
    const validatedData = validateData(teamMemberValidation.updateRole, {
      role,
    });

    if (!idUtils.validate(teamId) || !idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的团队ID或用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.teamMember(teamId, userId);

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: keys.PK,
            SK: keys.SK,
          },
          UpdateExpression: 'SET #role = :role',
          ExpressionAttributeNames: {
            '#role': 'role',
          },
          ExpressionAttributeValues: {
            ':role': validatedData.role,
          },
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as TeamMember;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError(
          '团队成员不存在',
          ERROR_CODES.ITEM_NOT_FOUND,
          404
        );
      }
      throw new DynamoDBError('更新成员角色失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 移除团队成员
  static async remove(teamId: string, userId: string): Promise<void> {
    if (!idUtils.validate(teamId) || !idUtils.validate(userId)) {
      throw new DynamoDBError(
        '无效的团队ID或用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const keys = generateKeys.teamMember(teamId, userId);

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
        throw new DynamoDBError(
          '团队成员不存在',
          ERROR_CODES.ITEM_NOT_FOUND,
          404
        );
      }
      throw new DynamoDBError('移除团队成员失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 检查用户是否是团队成员
  static async isMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.findByTeamAndUser(teamId, userId);
    return member !== null;
  }

  // 获取用户在团队中的角色
  static async getUserRole(
    teamId: string,
    userId: string
  ): Promise<string | null> {
    const member = await this.findByTeamAndUser(teamId, userId);
    return member?.role || null;
  }

  // 检查用户是否是团队所有者
  static async isOwner(teamId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRole(teamId, userId);
    return role === 'owner';
  }

  // 获取团队成员数量
  static async getTeamMemberCount(teamId: string): Promise<number> {
    const members = await this.findByTeam({ teamId });
    return members.length;
  }
}
