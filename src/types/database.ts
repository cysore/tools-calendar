// DynamoDB 数据模型类型定义

export interface User {
  PK: string; // USER#${userId}
  SK: string; // USER#${userId}
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string; // EMAIL#${email}
  GSI1SK: string; // USER#${userId}
}

export interface Team {
  PK: string; // TEAM#${teamId}
  SK: string; // TEAM#${teamId}
  teamId: string;
  name: string;
  description?: string;
  ownerId: string;
  subscriptionKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  PK: string; // TEAM#${teamId}
  SK: string; // MEMBER#${userId}
  teamId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
  joinedAt: string;
  GSI1PK: string; // USER#${userId}
  GSI1SK: string; // TEAM#${teamId}
}

export interface CalendarEvent {
  PK: string; // TEAM#${teamId}
  SK: string; // EVENT#${eventId}
  eventId: string;
  teamId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  category: 'meeting' | 'task' | 'reminder';
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string; // DATE#${YYYY-MM-DD}
  GSI1SK: string; // TEAM#${teamId}#EVENT#${eventId}
}

// 创建数据的输入类型
export interface CreateUserData {
  email: string;
  name: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  ownerId: string;
}

export interface CreateTeamMemberData {
  teamId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
}

export interface CreateEventData {
  teamId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  category: 'meeting' | 'task' | 'reminder';
  color: string;
  createdBy: string;
}

// 更新数据的输入类型
export interface UpdateTeamData {
  name?: string;
  description?: string;
}

export interface UpdateEventData {
  title?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  category?: 'meeting' | 'task' | 'reminder';
  color?: string;
}

// 查询参数类型
export interface GetEventsParams {
  teamId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetTeamMembersParams {
  teamId: string;
}

export interface GetUserTeamsParams {
  userId: string;
}
