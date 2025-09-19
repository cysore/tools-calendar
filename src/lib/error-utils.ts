import { ApiError } from '@/hooks/useErrorHandler';

// 错误类型定义
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 标准化错误接口
export interface StandardError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

// 错误分类器
export function classifyError(error: any): StandardError {
  const timestamp = new Date();

  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      timestamp,
      userMessage: '网络连接失败，请检查您的网络连接',
      recoverable: true,
      retryable: true,
    };
  }

  // API 错误
  if (error?.status) {
    switch (error.status) {
      case 401:
        return {
          type: ErrorType.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          message: error.message || 'Unauthorized',
          code: error.code,
          timestamp,
          userMessage: '登录已过期，请重新登录',
          recoverable: true,
          retryable: false,
        };

      case 403:
        return {
          type: ErrorType.AUTHORIZATION,
          severity: ErrorSeverity.MEDIUM,
          message: error.message || 'Forbidden',
          code: error.code,
          timestamp,
          userMessage: '您没有权限执行此操作',
          recoverable: false,
          retryable: false,
        };

      case 404:
        return {
          type: ErrorType.NOT_FOUND,
          severity: ErrorSeverity.LOW,
          message: error.message || 'Not Found',
          code: error.code,
          timestamp,
          userMessage: '请求的资源不存在',
          recoverable: false,
          retryable: false,
        };

      case 422:
        return {
          type: ErrorType.VALIDATION,
          severity: ErrorSeverity.LOW,
          message: error.message || 'Validation Error',
          code: error.code,
          details: error.details,
          timestamp,
          userMessage: '输入的数据格式不正确',
          recoverable: true,
          retryable: false,
        };

      case 408:
      case 504:
        return {
          type: ErrorType.TIMEOUT,
          severity: ErrorSeverity.MEDIUM,
          message: error.message || 'Request Timeout',
          code: error.code,
          timestamp,
          userMessage: '请求超时，请稍后重试',
          recoverable: true,
          retryable: true,
        };

      default:
        if (error.status >= 500) {
          return {
            type: ErrorType.SERVER,
            severity: ErrorSeverity.HIGH,
            message: error.message || 'Server Error',
            code: error.code,
            timestamp,
            userMessage: '服务器错误，请稍后重试',
            recoverable: true,
            retryable: true,
          };
        }
    }
  }

  // 验证错误
  if (error?.code === 'VALIDATION_ERROR') {
    return {
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      userMessage: error.message || '输入的数据不正确',
      recoverable: true,
      retryable: false,
    };
  }

  // 默认未知错误
  return {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error?.message || 'Unknown error',
    code: error?.code,
    details: error?.details,
    timestamp,
    userMessage: '发生了意外错误，请重试',
    recoverable: true,
    retryable: true,
  };
}

// 错误报告器
export class ErrorReporter {
  private static instance: ErrorReporter;
  private errorQueue: StandardError[] = [];
  private isReporting = false;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  // 报告错误
  async reportError(error: StandardError): Promise<void> {
    // 添加到队列
    this.errorQueue.push(error);

    // 如果是严重错误，立即报告
    if (
      error.severity === ErrorSeverity.CRITICAL ||
      error.severity === ErrorSeverity.HIGH
    ) {
      await this.flushErrors();
    }
  }

  // 批量发送错误报告
  private async flushErrors(): Promise<void> {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;
    const errorsToReport = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // 在生产环境中，这里应该发送到错误监控服务
      if (process.env.NODE_ENV === 'production') {
        await this.sendToMonitoringService(errorsToReport);
      } else {
        console.group('Error Report');
        errorsToReport.forEach(error => {
          console.error('Error:', error);
        });
        console.groupEnd();
      }
    } catch (reportingError) {
      console.error('Failed to report errors:', reportingError);
      // 将错误重新加入队列
      this.errorQueue.unshift(...errorsToReport);
    } finally {
      this.isReporting = false;
    }
  }

  private async sendToMonitoringService(
    errors: StandardError[]
  ): Promise<void> {
    // 实现发送到错误监控服务的逻辑
    // 例如：Sentry, LogRocket, Bugsnag 等
    console.log('Sending errors to monitoring service:', errors);
  }

  // 定期清理错误队列
  startPeriodicReporting(intervalMs: number = 30000): void {
    setInterval(() => {
      this.flushErrors();
    }, intervalMs);
  }
}

// 错误恢复策略
export interface RecoveryStrategy {
  canRecover(error: StandardError): boolean;
  recover(error: StandardError): Promise<boolean>;
}

export class NetworkRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: StandardError): boolean {
    return error.type === ErrorType.NETWORK || error.type === ErrorType.TIMEOUT;
  }

  async recover(error: StandardError): Promise<boolean> {
    // 检查网络连接
    if (!navigator.onLine) {
      return false;
    }

    // 尝试多个健康检查端点
    const healthEndpoints = ['/api/health', '/api/ping', '/'];

    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000), // 5秒超时
        });

        if (response.ok) {
          return true;
        }
      } catch {
        // 继续尝试下一个端点
        continue;
      }
    }

    return false;
  }
}

export class AuthRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: StandardError): boolean {
    return error.type === ErrorType.AUTHENTICATION;
  }

  async recover(error: StandardError): Promise<boolean> {
    // 尝试刷新令牌
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // 包含cookies
      });

      if (response.ok) {
        // 刷新成功，可能需要更新本地存储的令牌
        const data = await response.json();
        if (data.token) {
          // 更新本地令牌存储
          localStorage.setItem('auth-token', data.token);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}

// 新增：数据恢复策略
export class DataRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: StandardError): boolean {
    return (
      error.type === ErrorType.NOT_FOUND || error.type === ErrorType.SERVER
    );
  }

  async recover(error: StandardError): Promise<boolean> {
    // 尝试从缓存恢复数据
    try {
      if ('caches' in window) {
        const cache = await caches.open('api-cache');
        const cachedResponse = await cache.match(window.location.pathname);

        if (cachedResponse) {
          // 有缓存数据可用
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}

// 新增：重试策略
export class RetryRecoveryStrategy implements RecoveryStrategy {
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  canRecover(error: StandardError): boolean {
    return error.retryable;
  }

  async recover(error: StandardError): Promise<boolean> {
    const errorKey = `${error.type}-${error.message}`;
    const currentRetries = this.retryCount.get(errorKey) || 0;

    if (currentRetries >= this.maxRetries) {
      this.retryCount.delete(errorKey);
      return false;
    }

    this.retryCount.set(errorKey, currentRetries + 1);

    // 指数退避延迟
    const delay = Math.pow(2, currentRetries) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    return true;
  }
}

// 错误恢复管理器
export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [
    new NetworkRecoveryStrategy(),
    new AuthRecoveryStrategy(),
    new DataRecoveryStrategy(),
    new RetryRecoveryStrategy(),
  ];

  async attemptRecovery(error: StandardError): Promise<boolean> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            return true;
          }
        } catch (recoveryError) {
          console.error('Recovery strategy failed:', recoveryError);
        }
      }
    }
    return false;
  }
}

// 导出单例实例
export const errorReporter = ErrorReporter.getInstance();
export const errorRecoveryManager = new ErrorRecoveryManager();
