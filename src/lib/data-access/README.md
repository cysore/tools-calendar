# DynamoDB 数据访问层

这个模块提供了完整的 DynamoDB 数据访问层，包括用户、团队、团队成员和事件的 CRUD 操作。

## 功能特性

- ✅ 完整的数据验证和清理
- ✅ 类型安全的 TypeScript 接口
- ✅ 统一的错误处理
- ✅ 权限验证工具
- ✅ 单表设计优化查询性能
- ✅ GSI 支持复杂查询模式

## 使用示例

### 用户管理

```typescript
import { UserRepository } from './data-access';

// 创建用户
const user = await UserRepository.create({
  email: 'user@example.com',
  name: 'John Doe',
});

// 根据ID获取用户
const user = await UserRepository.findById('user-123');

// 根据邮箱获取用户
const user = await UserRepository.findByEmail('user@example.com');

// 更新用户
const updatedUser = await UserRepository.update('user-123', {
  name: 'Jane Doe',
});
```

### 团队管理

```typescript
import { TeamRepository } from './data-access';

// 创建团队
const team = await TeamRepository.create({
  name: 'Development Team',
  description: 'Our awesome dev team',
  ownerId: 'user-123',
});

// 获取团队
const team = await TeamRepository.findById('team-456');

// 更新团队
const updatedTeam = await TeamRepository.update('team-456', {
  name: 'Updated Team Name',
});

// 重新生成订阅密钥
const newKey = await TeamRepository.regenerateSubscriptionKey('team-456');
```

### 团队成员管理

```typescript
import { TeamMemberRepository } from './data-access';

// 添加团队成员
const member = await TeamMemberRepository.create({
  teamId: 'team-456',
  userId: 'user-789',
  role: 'member',
});

// 获取团队所有成员
const members = await TeamMemberRepository.findByTeam({ teamId: 'team-456' });

// 获取用户所属的团队
const userTeams = await TeamMemberRepository.findByUser({ userId: 'user-123' });

// 更新成员角色
const updatedMember = await TeamMemberRepository.updateRole(
  'team-456',
  'user-789',
  'owner'
);

// 检查权限
const isOwner = await TeamMemberRepository.isOwner('team-456', 'user-123');
const role = await TeamMemberRepository.getUserRole('team-456', 'user-123');
```

### 事件管理

```typescript
import { EventRepository } from './data-access';

// 创建事件
const event = await EventRepository.create({
  teamId: 'team-456',
  title: 'Team Meeting',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T11:00:00Z',
  isAllDay: false,
  location: 'Conference Room A',
  description: 'Weekly team sync',
  category: 'meeting',
  color: '#FF0000',
  createdBy: 'user-123',
});

// 获取团队事件
const events = await EventRepository.findByTeam({ teamId: 'team-456' });

// 按日期范围获取事件
const eventsInRange = await EventRepository.findByDateRange(
  '2024-01-01',
  '2024-01-31',
  'team-456'
);

// 更新事件
const updatedEvent = await EventRepository.update('team-456', 'event-789', {
  title: 'Updated Meeting Title',
  startTime: '2024-01-15T14:00:00Z',
});

// 按分类获取事件
const meetings = await EventRepository.findByCategory('team-456', 'meeting');
```

## 数据验证

所有输入数据都会经过严格的验证：

```typescript
import { validateData, userValidation } from './data-access';

try {
  const validatedData = validateData(userValidation.create, {
    email: 'user@example.com',
    name: 'John Doe',
  });
} catch (error) {
  if (error instanceof DynamoDBError) {
    console.log('验证失败:', error.message);
  }
}
```

## 错误处理

统一的错误处理机制：

```typescript
import { DynamoDBError, ERROR_CODES } from './data-access';

try {
  const user = await UserRepository.findById('invalid-id');
} catch (error) {
  if (error instanceof DynamoDBError) {
    switch (error.code) {
      case ERROR_CODES.VALIDATION_ERROR:
        // 处理验证错误
        break;
      case ERROR_CODES.ITEM_NOT_FOUND:
        // 处理未找到错误
        break;
      case ERROR_CODES.PERMISSION_DENIED:
        // 处理权限错误
        break;
      default:
      // 处理其他错误
    }
  }
}
```

## 权限检查

内置的权限验证工具：

```typescript
import { permissionUtils } from './data-access';

// 检查事件编辑权限
const canEdit = permissionUtils.canEditEvent('member', 'user-123', 'user-123');

// 检查团队管理权限
const canManage = permissionUtils.canManageTeam('owner');

// 检查成员邀请权限
const canInvite = permissionUtils.canInviteMembers('member');
```

## 环境配置

确保设置以下环境变量：

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_NAME=team-calendar-sync
```

## 数据库表结构

使用单表设计，主要访问模式：

1. **用户查询**: `PK = USER#${userId}`
2. **团队查询**: `PK = TEAM#${teamId}`
3. **团队成员查询**: `PK = TEAM#${teamId}, SK begins_with MEMBER#`
4. **团队事件查询**: `PK = TEAM#${teamId}, SK begins_with EVENT#`
5. **用户团队查询**: `GSI1PK = USER#${userId}, GSI1SK begins_with TEAM#`
6. **日期事件查询**: `GSI1PK = DATE#${date}`

## 测试

运行数据访问层测试：

```bash
npm test -- --testPathPattern=data-access.test.ts
```
