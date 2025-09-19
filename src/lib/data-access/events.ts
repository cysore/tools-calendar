// 事件数据访问层

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
  CalendarEvent,
  CreateEventData,
  UpdateEventData,
  GetEventsParams,
} from '../../types/database';
import {
  validateData,
  eventValidation,
  sanitizeData,
  idUtils,
  dateUtils,
} from '../data-validation';

export class EventRepository {
  // 创建事件
  static async create(eventData: CreateEventData): Promise<CalendarEvent> {
    const validatedData = validateData(eventValidation.create, eventData);

    const eventId = idUtils.generate();
    const now = dateUtils.now();
    const eventDate = dateUtils.formatDate(validatedData.startTime);

    const keys = generateKeys.event(validatedData.teamId, eventId, eventDate);

    const event: CalendarEvent = {
      ...keys,
      eventId,
      teamId: validatedData.teamId,
      title: sanitizeData.string(validatedData.title),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      isAllDay: validatedData.isAllDay,
      location: validatedData.location
        ? sanitizeData.string(validatedData.location)
        : undefined,
      description: validatedData.description
        ? sanitizeData.html(validatedData.description)
        : undefined,
      category: validatedData.category,
      color: sanitizeData.color(validatedData.color),
      createdBy: validatedData.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.MAIN,
          Item: event,
          ConditionExpression:
            'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        })
      );

      return event;
    } catch (error) {
      throw new DynamoDBError('创建事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 根据事件ID获取事件
  static async findById(
    teamId: string,
    eventId: string
  ): Promise<CalendarEvent | null> {
    if (!idUtils.validate(teamId) || !idUtils.validate(eventId)) {
      throw new DynamoDBError(
        '无效的团队ID或事件ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: `TEAM#${teamId}`,
            SK: `EVENT#${eventId}`,
          },
        })
      );

      return (result.Item as CalendarEvent) || null;
    } catch (error) {
      throw new DynamoDBError('获取事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 获取团队的所有事件
  static async findByTeam(params: GetEventsParams): Promise<CalendarEvent[]> {
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
            ':sk': 'EVENT#',
          },
        })
      );

      let events = (result.Items as CalendarEvent[]) || [];

      // 如果指定了日期范围，进行过滤
      if (params.startDate || params.endDate) {
        events = this.filterEventsByDateRange(
          events,
          params.startDate,
          params.endDate
        );
      }

      return events;
    } catch (error) {
      throw new DynamoDBError('获取团队事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 根据日期范围获取事件（使用GSI优化查询）
  static async findByDateRange(
    startDate: string,
    endDate: string,
    teamId?: string
  ): Promise<CalendarEvent[]> {
    if (!dateUtils.isValidDate(startDate) || !dateUtils.isValidDate(endDate)) {
      throw new DynamoDBError(
        '无效的日期格式',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const dateRange = dateUtils.getDateRange(startDate, endDate);
      const allEvents: CalendarEvent[] = [];

      // 为每个日期执行查询
      for (const date of dateRange) {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAMES.MAIN,
            IndexName: GSI_NAMES.GSI1,
            KeyConditionExpression: 'GSI1PK = :gsi1pk',
            ExpressionAttributeValues: {
              ':gsi1pk': `DATE#${date}`,
            },
          })
        );

        if (result.Items) {
          allEvents.push(...(result.Items as CalendarEvent[]));
        }
      }

      // 如果指定了团队ID，进行过滤
      if (teamId) {
        return allEvents.filter(event => event.teamId === teamId);
      }

      return allEvents;
    } catch (error) {
      throw new DynamoDBError(
        '根据日期范围获取事件失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 更新事件
  static async update(
    teamId: string,
    eventId: string,
    updateData: UpdateEventData
  ): Promise<CalendarEvent> {
    const validatedData = validateData(eventValidation.update, updateData);

    if (!idUtils.validate(teamId) || !idUtils.validate(eventId)) {
      throw new DynamoDBError(
        '无效的团队ID或事件ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const now = dateUtils.now();

    // 构建更新表达式
    const updateExpressions: string[] = ['updatedAt = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now,
    };

    if (validatedData.title !== undefined) {
      updateExpressions.push('title = :title');
      expressionAttributeValues[':title'] = sanitizeData.string(
        validatedData.title
      );
    }

    if (validatedData.startTime !== undefined) {
      updateExpressions.push('startTime = :startTime');
      expressionAttributeValues[':startTime'] = validatedData.startTime;

      // 如果更新了开始时间，需要更新GSI1PK
      const newDate = dateUtils.formatDate(validatedData.startTime);
      updateExpressions.push('GSI1PK = :gsi1pk');
      expressionAttributeValues[':gsi1pk'] = `DATE#${newDate}`;
    }

    if (validatedData.endTime !== undefined) {
      updateExpressions.push('endTime = :endTime');
      expressionAttributeValues[':endTime'] = validatedData.endTime;
    }

    if (validatedData.isAllDay !== undefined) {
      updateExpressions.push('isAllDay = :isAllDay');
      expressionAttributeValues[':isAllDay'] = validatedData.isAllDay;
    }

    if (validatedData.location !== undefined) {
      updateExpressions.push('location = :location');
      expressionAttributeValues[':location'] = validatedData.location
        ? sanitizeData.string(validatedData.location)
        : null;
    }

    if (validatedData.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = validatedData.description
        ? sanitizeData.html(validatedData.description)
        : null;
    }

    if (validatedData.category !== undefined) {
      updateExpressions.push('category = :category');
      expressionAttributeValues[':category'] = validatedData.category;
    }

    if (validatedData.color !== undefined) {
      updateExpressions.push('color = :color');
      expressionAttributeValues[':color'] = sanitizeData.color(
        validatedData.color
      );
    }

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: `TEAM#${teamId}`,
            SK: `EVENT#${eventId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(PK)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as CalendarEvent;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('事件不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError('更新事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 删除事件
  static async delete(teamId: string, eventId: string): Promise<void> {
    if (!idUtils.validate(teamId) || !idUtils.validate(eventId)) {
      throw new DynamoDBError(
        '无效的团队ID或事件ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.MAIN,
          Key: {
            PK: `TEAM#${teamId}`,
            SK: `EVENT#${eventId}`,
          },
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        throw new DynamoDBError('事件不存在', ERROR_CODES.ITEM_NOT_FOUND, 404);
      }
      throw new DynamoDBError('删除事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 获取用户创建的事件
  static async findByCreator(
    teamId: string,
    createdBy: string
  ): Promise<CalendarEvent[]> {
    if (!idUtils.validate(teamId) || !idUtils.validate(createdBy)) {
      throw new DynamoDBError(
        '无效的团队ID或用户ID',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.MAIN,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          FilterExpression: 'createdBy = :createdBy',
          ExpressionAttributeValues: {
            ':pk': `TEAM#${teamId}`,
            ':sk': 'EVENT#',
            ':createdBy': createdBy,
          },
        })
      );

      return (result.Items as CalendarEvent[]) || [];
    } catch (error) {
      throw new DynamoDBError(
        '获取用户创建的事件失败',
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  // 按分类获取事件
  static async findByCategory(
    teamId: string,
    category: 'meeting' | 'task' | 'reminder'
  ): Promise<CalendarEvent[]> {
    if (!idUtils.validate(teamId)) {
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
          FilterExpression: 'category = :category',
          ExpressionAttributeValues: {
            ':pk': `TEAM#${teamId}`,
            ':sk': 'EVENT#',
            ':category': category,
          },
        })
      );

      return (result.Items as CalendarEvent[]) || [];
    } catch (error) {
      throw new DynamoDBError('按分类获取事件失败', ERROR_CODES.INTERNAL_ERROR);
    }
  }

  // 辅助方法：按日期范围过滤事件
  private static filterEventsByDateRange(
    events: CalendarEvent[],
    startDate?: string,
    endDate?: string
  ): CalendarEvent[] {
    return events.filter(event => {
      const eventDate = dateUtils.formatDate(event.startTime);

      if (startDate && eventDate < startDate) {
        return false;
      }

      if (endDate && eventDate > endDate) {
        return false;
      }

      return true;
    });
  }

  // 验证事件是否存在
  static async exists(teamId: string, eventId: string): Promise<boolean> {
    const event = await this.findById(teamId, eventId);
    return event !== null;
  }
}

// Type conversion functions
function convertDatabaseEventToApiEvent(
  dbEvent: CalendarEvent
): import('@/types').CalendarEvent {
  return {
    id: dbEvent.eventId,
    teamId: dbEvent.teamId,
    title: dbEvent.title,
    startTime: dbEvent.startTime,
    endTime: dbEvent.endTime,
    isAllDay: dbEvent.isAllDay,
    location: dbEvent.location,
    description: dbEvent.description,
    category: dbEvent.category,
    color: dbEvent.color,
    createdBy: dbEvent.createdBy,
    createdAt: dbEvent.createdAt,
    updatedAt: dbEvent.updatedAt,
  };
}

// Wrapper functions for easier API usage
export async function getTeamEvents(
  teamId: string
): Promise<import('@/types').CalendarEvent[]> {
  const dbEvents = await EventRepository.findByTeam({ teamId });
  return dbEvents.map(convertDatabaseEventToApiEvent);
}

export async function getEventById(
  eventId: string
): Promise<import('@/types').CalendarEvent | null> {
  // Since we need teamId for the repository method, we'll need to search across teams
  // For now, let's implement a simple approach that requires both teamId and eventId
  throw new Error(
    'getEventById requires teamId parameter. Use EventRepository.findById(teamId, eventId) instead.'
  );
}

export async function getEventByIdAndTeam(
  teamId: string,
  eventId: string
): Promise<import('@/types').CalendarEvent | null> {
  const dbEvent = await EventRepository.findById(teamId, eventId);
  return dbEvent ? convertDatabaseEventToApiEvent(dbEvent) : null;
}
