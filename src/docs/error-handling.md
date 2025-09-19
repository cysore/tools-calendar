# 错误处理和用户体验系统

本文档描述了团队日历同步器应用中实现的全面错误处理和用户体验系统。

## 概述

错误处理系统包含以下核心组件：

1. **全局错误边界** - 捕获 React 组件错误
2. **错误处理钩子** - 统一的错误处理逻辑
3. **错误恢复机制** - 自动和手动错误恢复
4. **用户反馈系统** - Toast 通知和加载状态
5. **错误页面** - 专门的错误显示页面
6. **API 客户端** - 带重试和错误处理的网络请求

## 核心组件

### 1. ErrorBoundary 组件

全局错误边界组件，捕获 React 组件树中的 JavaScript 错误。

```tsx
import { ErrorBoundary } from '@/components/error';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 自定义错误处理逻辑
        console.error('Application error:', error, errorInfo);
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

**特性：**

- 自动捕获组件错误
- 显示友好的错误 UI
- 提供重试功能
- 支持自定义 fallback UI
- 开发环境显示详细错误信息

### 2. useErrorHandler 钩子

统一的错误处理钩子，提供错误分类、处理和恢复功能。

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, withErrorHandling, clearError } = useErrorHandler();

  const fetchData = withErrorHandling(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  });

  return <button onClick={fetchData}>获取数据</button>;
}
```

**特性：**

- 自动错误分类和处理
- 包装函数自动错误捕获
- 错误状态管理
- 与路由集成（自动重定向）

### 3. Toast 通知系统

用户友好的通知系统，显示成功、错误、警告和信息消息。

```tsx
import { useToast } from '@/components/ui/toast';

function MyComponent() {
  const { success, error, warning, info } = useToast();

  const handleAction = async () => {
    try {
      await someAsyncAction();
      success('操作成功完成');
    } catch (err) {
      error('操作失败', '请稍后重试');
    }
  };

  return <button onClick={handleAction}>执行操作</button>;
}
```

**特性：**

- 多种通知类型
- 自动消失
- 可自定义持续时间
- 支持操作按钮

### 4. 加载状态组件

统一的加载状态管理，包括骨架屏、加载指示器和错误状态。

```tsx
import {
  DataLoadingState,
  CalendarSkeleton,
} from '@/components/ui/loading-states';

function MyComponent() {
  const { data, loading, error, refetch } = useFetch('/api/data');

  return (
    <DataLoadingState
      loading={loading}
      error={error}
      data={data}
      skeleton={<CalendarSkeleton />}
      onRetry={refetch}
      emptyMessage="暂无数据"
    >
      {/* 实际内容 */}
      <div>
        {data.map(item => (
          <Item key={item.id} {...item} />
        ))}
      </div>
    </DataLoadingState>
  );
}
```

**特性：**

- 统一的加载状态处理
- 多种骨架屏组件
- 错误重试功能
- 空状态处理

### 5. 错误恢复组件

智能错误恢复组件，提供多种恢复策略。

```tsx
import { ErrorRecovery } from '@/components/error/ErrorRecovery';

function MyComponent() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <ErrorRecovery
        error={error}
        onRetry={() => {
          setError(null);
          // 重试逻辑
        }}
        autoRetry={true}
        maxRetries={3}
        showNetworkStatus={true}
      />
    );
  }

  return <div>正常内容</div>;
}
```

**特性：**

- 自动重试机制
- 网络状态监控
- 指数退避策略
- 手动重试选项

### 6. API 客户端

增强的 API 客户端，内置错误处理、重试和超时机制。

```tsx
import { apiClient } from '@/lib/api-client';

// 自动重试和错误处理
const data = await apiClient.get('/api/events', {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
});

// POST 请求
const result = await apiClient.post('/api/events', {
  title: '新事件',
  startTime: new Date().toISOString(),
});
```

**特性：**

- 自动重试机制
- 请求超时处理
- 统一错误格式
- 缓存支持

## 错误分类系统

系统自动将错误分类为以下类型：

### 网络错误 (Network)

- 连接失败
- 超时错误
- DNS 解析失败

**处理策略：**

- 自动重试（指数退避）
- 显示网络状态
- 提供手动重试

### 认证错误 (Authentication)

- 401 未授权
- Token 过期

**处理策略：**

- 自动跳转到登录页
- 尝试刷新 Token
- 清除本地认证状态

### 权限错误 (Authorization)

- 403 禁止访问
- 权限不足

**处理策略：**

- 显示权限错误页面
- 提供联系管理员选项
- 返回上一页

### 验证错误 (Validation)

- 表单验证失败
- 数据格式错误

**处理策略：**

- 显示具体错误信息
- 高亮错误字段
- 提供修正建议

### 服务器错误 (Server)

- 5xx 服务器错误
- 内部错误

**处理策略：**

- 自动重试
- 显示友好错误信息
- 记录错误日志

## 使用指南

### 1. 在组件中使用错误处理

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/components/ui/toast';

function MyComponent() {
  const { withErrorHandling } = useErrorHandler();
  const { success, error } = useToast();

  const handleSubmit = withErrorHandling(async data => {
    const result = await apiClient.post('/api/submit', data);
    success('提交成功');
    return result;
  });

  return <form onSubmit={handleSubmit}>{/* 表单内容 */}</form>;
}
```

### 2. 创建错误边界

```tsx
import { ErrorBoundary } from '@/components/error';

function FeatureComponent() {
  return (
    <ErrorBoundary
      fallback={<div>功能暂时不可用</div>}
      onError={error => {
        // 记录特定功能的错误
        console.error('Feature error:', error);
      }}
    >
      <ComplexFeature />
    </ErrorBoundary>
  );
}
```

### 3. 使用加载状态

```tsx
import {
  LoadingButton,
  FormLoadingOverlay,
} from '@/components/ui/loading-states';

function MyForm() {
  const [loading, setLoading] = useState(false);

  return (
    <FormLoadingOverlay loading={loading}>
      <form>
        {/* 表单字段 */}
        <LoadingButton
          loading={loading}
          loadingText="提交中..."
          onClick={handleSubmit}
        >
          提交
        </LoadingButton>
      </form>
    </FormLoadingOverlay>
  );
}
```

### 4. 自定义错误页面

```tsx
// app/error.tsx
'use client';

import { GenericErrorPage } from '@/components/error';

export default function Error({ error, reset }) {
  return <GenericErrorPage error={error} onRetry={reset} />;
}
```

## 最佳实践

### 1. 错误处理层次

1. **组件级别** - 使用 useErrorHandler 处理特定操作错误
2. **功能级别** - 使用 ErrorBoundary 包装功能模块
3. **页面级别** - 使用页面级错误边界
4. **应用级别** - 全局错误边界和错误监控

### 2. 用户体验原则

1. **及时反馈** - 立即显示加载状态和错误信息
2. **友好提示** - 使用用户友好的错误消息
3. **恢复选项** - 总是提供重试或替代方案
4. **状态保持** - 错误恢复后保持用户状态

### 3. 错误监控

```tsx
// 生产环境错误监控
if (process.env.NODE_ENV === 'production') {
  window.addEventListener('error', event => {
    // 发送到错误监控服务
    errorReporter.reportError(classifyError(event.error));
  });

  window.addEventListener('unhandledrejection', event => {
    // 处理未捕获的 Promise 拒绝
    errorReporter.reportError(classifyError(event.reason));
  });
}
```

### 4. 性能考虑

1. **懒加载** - 错误页面组件按需加载
2. **防抖** - 避免频繁的错误报告
3. **缓存** - 缓存错误恢复状态
4. **批处理** - 批量发送错误报告

## 测试策略

### 1. 单元测试

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error';

test('should display error UI when error occurs', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
});
```

### 2. 集成测试

```tsx
test('should retry failed requests', async () => {
  const mockFetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ ok: true, json: () => ({ data: 'success' }) });

  global.fetch = mockFetch;

  const { result } = renderHook(() => useErrorHandler());

  const wrappedFn = result.current.withErrorHandling(async () => {
    const response = await fetch('/api/test');
    return response.json();
  });

  await wrappedFn();

  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

### 3. E2E 测试

```typescript
// playwright 测试
test('should handle network errors gracefully', async ({ page }) => {
  // 模拟网络错误
  await page.route('/api/events', route => route.abort());

  await page.goto('/calendar');

  // 验证错误处理
  await expect(page.getByText('网络连接失败')).toBeVisible();
  await expect(page.getByText('重试')).toBeVisible();
});
```

## 配置选项

### 错误报告配置

```typescript
// src/lib/error-config.ts
export const errorConfig = {
  // 错误报告
  reporting: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: process.env.ERROR_REPORTING_ENDPOINT,
    batchSize: 10,
    flushInterval: 30000,
  },

  // 重试配置
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },

  // 超时配置
  timeout: {
    default: 10000,
    upload: 30000,
    download: 60000,
  },
};
```

### Toast 配置

```typescript
// src/components/ui/toast.tsx
const toastConfig = {
  duration: {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
  },
  maxToasts: 5,
  position: 'top-right',
};
```

## 总结

这个错误处理系统提供了：

1. **全面的错误捕获** - 从组件错误到网络错误
2. **智能的错误分类** - 自动识别错误类型并应用相应策略
3. **友好的用户体验** - 清晰的错误信息和恢复选项
4. **强大的恢复机制** - 自动重试和手动恢复
5. **完整的监控体系** - 错误报告和性能监控

通过这个系统，应用能够优雅地处理各种错误情况，为用户提供稳定可靠的使用体验。
