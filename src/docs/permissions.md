# 用户角色和权限系统文档

## 概述

团队日历同步器实现了基于角色的访问控制 (RBAC) 系统，支持三种用户角色：Owner（所有者）、Member（成员）和 Viewer（查看者）。每个角色都有不同的权限级别，确保团队协作的安全性和有序性。

## 用户角色

### Owner（所有者）

- **描述**: 团队的创建者和管理者
- **权限**: 拥有所有权限，包括团队管理、成员管理、事件管理和订阅管理
- **限制**: 每个团队至少需要一个 Owner，最后一个 Owner 不能离开团队

### Member（成员）

- **描述**: 团队的活跃参与者
- **权限**: 可以创建和管理自己的事件，邀请新成员，查看团队信息
- **限制**: 不能管理团队设置，不能编辑或删除他人创建的事件

### Viewer（查看者）

- **描述**: 团队的只读用户
- **权限**: 只能查看团队事件、订阅信息和团队设置
- **限制**: 不能创建、编辑或删除任何内容，不能邀请成员

## 权限列表

### 团队管理权限

- `MANAGE_TEAM`: 管理团队（删除团队等）
- `INVITE_MEMBERS`: 邀请新成员
- `REMOVE_MEMBERS`: 移除团队成员
- `UPDATE_MEMBER_ROLES`: 更新成员角色

### 事件管理权限

- `CREATE_EVENTS`: 创建新事件
- `EDIT_ALL_EVENTS`: 编辑所有事件
- `EDIT_OWN_EVENTS`: 编辑自己创建的事件
- `DELETE_ALL_EVENTS`: 删除所有事件
- `DELETE_OWN_EVENTS`: 删除自己创建的事件
- `VIEW_EVENTS`: 查看事件

### 订阅管理权限

- `MANAGE_SUBSCRIPTIONS`: 管理订阅设置
- `VIEW_SUBSCRIPTIONS`: 查看订阅信息

### 团队设置权限

- `UPDATE_TEAM_SETTINGS`: 更新团队设置
- `VIEW_TEAM_SETTINGS`: 查看团队设置

## 权限矩阵

| 权限           | Owner | Member | Viewer |
| -------------- | ----- | ------ | ------ |
| 管理团队       | ✅    | ❌     | ❌     |
| 邀请成员       | ✅    | ✅     | ❌     |
| 移除成员       | ✅    | ❌     | ❌     |
| 更新成员角色   | ✅    | ❌     | ❌     |
| 创建事件       | ✅    | ✅     | ❌     |
| 编辑所有事件   | ✅    | ❌     | ❌     |
| 编辑自己的事件 | ✅    | ✅     | ❌     |
| 删除所有事件   | ✅    | ❌     | ❌     |
| 删除自己的事件 | ✅    | ✅     | ❌     |
| 查看事件       | ✅    | ✅     | ✅     |
| 管理订阅       | ✅    | ❌     | ❌     |
| 查看订阅       | ✅    | ✅     | ✅     |
| 更新团队设置   | ✅    | ❌     | ❌     |
| 查看团队设置   | ✅    | ✅     | ✅     |

## API 使用示例

### 基础权限检查

```typescript
import { hasPermission, Permission } from '@/lib/permissions';
import { UserRole } from '@/types/auth';

const userRole: UserRole = 'member';

// 检查用户是否可以创建事件
if (hasPermission(userRole, Permission.CREATE_EVENTS)) {
  // 允许创建事件
}

// 检查用户是否可以管理团队
if (hasPermission(userRole, Permission.MANAGE_TEAM)) {
  // 允许管理团队
}
```

### 事件权限检查

```typescript
import { canEditEvent, canDeleteEvent } from '@/lib/permissions';

const userRole: UserRole = 'member';
const eventCreatedBy = 'user123';
const currentUserId = 'user456';

// 检查是否可以编辑事件
if (canEditEvent(userRole, eventCreatedBy, currentUserId)) {
  // 允许编辑事件
}

// 检查是否可以删除事件
if (canDeleteEvent(userRole, eventCreatedBy, currentUserId)) {
  // 允许删除事件
}
```

### API 路由权限验证

```typescript
import { withTeamPermission } from '@/lib/team-auth';
import { Permission } from '@/lib/permissions';

// 需要特定权限的 API 路由
export const POST = withTeamPermission(
  Permission.CREATE_EVENTS,
  async request => {
    // 只有有权限的用户才能访问这里
    const { teamAuth } = request;
    // 处理请求...
  }
);
```

### React 组件权限守卫

```tsx
import {
  PermissionGuard,
  TeamManagementGuard,
} from '@/components/permissions/PermissionGuard';
import { Permission } from '@/lib/permissions';

function TeamSettings({ userRole }: { userRole: UserRole }) {
  return (
    <div>
      {/* 只有 Owner 可以看到团队管理按钮 */}
      <TeamManagementGuard userRole={userRole}>
        <button>删除团队</button>
      </TeamManagementGuard>

      {/* 只有有邀请权限的用户可以看到邀请按钮 */}
      <PermissionGuard
        userRole={userRole}
        permission={Permission.INVITE_MEMBERS}
      >
        <button>邀请成员</button>
      </PermissionGuard>
    </div>
  );
}
```

### 使用权限钩子

```tsx
import { usePermissions } from '@/components/permissions/PermissionGuard';

function EventCard({ event, userRole, currentUserId }: EventCardProps) {
  const permissions = usePermissions(userRole);

  return (
    <div>
      <h3>{event.title}</h3>

      {permissions.canEditEvent(event.createdBy, currentUserId) && (
        <button>编辑</button>
      )}

      {permissions.canDeleteEvent(event.createdBy, currentUserId) && (
        <button>删除</button>
      )}
    </div>
  );
}
```

## 中间件使用

### 团队访问控制

```typescript
import { withTeamAuth, withTeamPermission } from '@/lib/team-auth';

// 需要团队成员身份
export const GET = withTeamAuth(async request => {
  const { teamAuth } = request;
  // teamAuth.userId, teamAuth.teamId, teamAuth.role 可用
});

// 需要特定权限
export const PUT = withTeamPermission(
  Permission.UPDATE_TEAM_SETTINGS,
  async request => {
    // 只有有权限的用户才能访问
  }
);
```

### 事件权限验证

```typescript
import { requireEventPermission } from '@/lib/team-auth';

export const PUT = withTeamAuth(async request => {
  const { teamAuth } = request;
  const event = await getEvent(eventId);

  // 验证事件编辑权限
  await requireEventPermission(teamAuth, event.createdBy, 'edit');

  // 继续处理请求...
});
```

## 错误处理

权限系统会抛出 `PermissionError` 错误，包含以下信息：

```typescript
class PermissionError extends Error {
  requiredPermission: Permission;
  userRole: UserRole;
}
```

API 路由会自动处理这些错误并返回适当的 HTTP 状态码：

- `401 Unauthorized`: 用户未认证
- `403 Forbidden`: 用户已认证但权限不足
- `400 Bad Request`: 请求参数错误（如缺少团队ID）

## 最佳实践

### 1. 前端权限检查

- 使用权限守卫组件进行条件渲染
- 使用权限钩子进行逻辑判断
- 始终在后端验证权限，前端检查仅用于用户体验

### 2. 后端权限验证

- 在所有 API 路由中验证权限
- 使用中间件包装器简化权限检查
- 对敏感操作进行额外的权限验证

### 3. 错误处理

- 提供清晰的错误消息
- 区分认证错误和授权错误
- 记录权限违规尝试用于安全审计

### 4. 测试

- 为每个权限场景编写测试
- 测试边界情况（如最后一个 Owner 离开团队）
- 验证权限继承和层级关系

## 安全考虑

1. **最小权限原则**: 用户只获得完成任务所需的最小权限
2. **权限验证**: 所有敏感操作都在服务器端验证权限
3. **审计日志**: 记录权限变更和敏感操作
4. **会话管理**: 权限变更后及时更新用户会话
5. **防护措施**: 防止权限提升和越权访问

## 扩展性

权限系统设计为可扩展的：

1. **新权限**: 在 `Permission` 枚举中添加新权限
2. **新角色**: 在 `ROLE_PERMISSIONS` 中定义新角色的权限
3. **自定义权限**: 实现特定业务逻辑的权限检查函数
4. **权限组合**: 支持复杂的权限组合和条件检查
