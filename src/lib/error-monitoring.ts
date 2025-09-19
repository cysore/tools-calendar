import { StandardError, ErrorType, ErrorSeverity } from './error-utils';

// 错误统计接口
interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: StandardError[];
  recoveryRate: number;
  averageRecoveryTime: number;
}

// 错误监控配置
interface MonitoringConfig {
  enableRealTimeReporting: boolean;
  enablePerformanceTracking: boolean;
  enableUserBehaviorTracking: boolean;
  maxRecentErrors: number;
  reportingInterval: number;
  enableLocalStorage: boolean;
}

// 错误监控器
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private config: MonitoringConfig;
  private errorHistory: StandardError[] = [];
  private recoveryAttempts: Map<
    string,
    { startTime: number; success: boolean }
  > = new Map();
  private performanceMarks: Map<string, number> = new Map();

  private constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableRealTimeReporting: true,
      enablePerformanceTracking: true,
      enableUserBehaviorTracking: true,
      maxRecentErrors: 100,
      reportingInterval: 30000, // 30秒
      enableLocalStorage: true,
      ...config,
    };

    this.initializeMonitoring();
  }

  static getInstance(config?: Partial<MonitoringConfig>): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor(config);
    }
    return ErrorMonitor.instance;
  }

  private initializeMonitoring() {
    // 从本地存储恢复错误历史
    if (this.config.enableLocalStorage) {
      this.loadErrorHistory();
    }

    // 启动定期报告
    if (this.config.enableRealTimeReporting) {
      setInterval(() => {
        this.sendPeriodicReport();
      }, this.config.reportingInterval);
    }

    // 监听页面卸载事件，保存数据
    window.addEventListener('beforeunload', () => {
      if (this.config.enableLocalStorage) {
        this.saveErrorHistory();
      }
    });

    // 监听性能事件
    if (this.config.enablePerformanceTracking) {
      this.initializePerformanceTracking();
    }
  }

  // 记录错误
  recordError(error: StandardError, context?: any) {
    const enrichedError = {
      ...error,
      id: this.generateErrorId(),
      context,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      deviceInfo: this.getDeviceInfo(),
      performanceMetrics: this.getPerformanceMetrics(),
    };

    this.errorHistory.push(enrichedError);

    // 限制历史记录大小
    if (this.errorHistory.length > this.config.maxRecentErrors) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxRecentErrors);
    }

    // 实时报告严重错误
    if (
      error.severity === ErrorSeverity.CRITICAL ||
      error.severity === ErrorSeverity.HIGH
    ) {
      this.sendImmediateReport(enrichedError);
    }

    // 保存到本地存储
    if (this.config.enableLocalStorage) {
      this.saveErrorHistory();
    }
  }

  // 记录恢复尝试
  recordRecoveryAttempt(errorId: string, startTime: number = Date.now()) {
    this.recoveryAttempts.set(errorId, { startTime, success: false });
  }

  // 记录恢复成功
  recordRecoverySuccess(errorId: string) {
    const attempt = this.recoveryAttempts.get(errorId);
    if (attempt) {
      attempt.success = true;
      this.recoveryAttempts.set(errorId, attempt);
    }
  }

  // 获取错误统计
  getErrorStats(): ErrorStats {
    const totalErrors = this.errorHistory.length;
    const errorsByType = this.groupErrorsByType();
    const errorsBySeverity = this.groupErrorsBySeverity();
    const recentErrors = this.errorHistory.slice(-10);
    const recoveryRate = this.calculateRecoveryRate();
    const averageRecoveryTime = this.calculateAverageRecoveryTime();

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recentErrors,
      recoveryRate,
      averageRecoveryTime,
    };
  }

  // 获取错误趋势
  getErrorTrends(timeRange: number = 24 * 60 * 60 * 1000): any {
    const now = Date.now();
    const cutoff = now - timeRange;

    const recentErrors = this.errorHistory.filter(
      error => error.timestamp.getTime() > cutoff
    );

    // 按小时分组
    const hourlyErrors = new Map<number, number>();
    recentErrors.forEach(error => {
      const hour = Math.floor(error.timestamp.getTime() / (60 * 60 * 1000));
      hourlyErrors.set(hour, (hourlyErrors.get(hour) || 0) + 1);
    });

    return {
      totalRecentErrors: recentErrors.length,
      hourlyDistribution: Array.from(hourlyErrors.entries()),
      errorRate: recentErrors.length / (timeRange / (60 * 60 * 1000)), // 每小时错误率
    };
  }

  // 导出错误报告
  exportErrorReport(): string {
    const stats = this.getErrorStats();
    const trends = this.getErrorTrends();

    const report = {
      timestamp: new Date().toISOString(),
      stats,
      trends,
      recentErrors: this.errorHistory.slice(-20),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    };

    return JSON.stringify(report, null, 2);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error-monitor-session');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-monitor-session', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | null {
    // 尝试从认证系统获取用户ID
    try {
      const token = localStorage.getItem('auth-token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId || null;
      }
    } catch {
      // 忽略解析错误
    }
    return null;
  }

  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  private getPerformanceMetrics() {
    if (!this.config.enablePerformanceTracking) {
      return null;
    }

    try {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
        domContentLoaded:
          navigation?.domContentLoadedEventEnd -
          navigation?.domContentLoadedEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')
          ?.startTime,
        firstContentfulPaint: paint.find(
          entry => entry.name === 'first-contentful-paint'
        )?.startTime,
        memoryUsage: (performance as any).memory
          ? {
              used: (performance as any).memory.usedJSHeapSize,
              total: (performance as any).memory.totalJSHeapSize,
              limit: (performance as any).memory.jsHeapSizeLimit,
            }
          : null,
      };
    } catch {
      return null;
    }
  }

  private groupErrorsByType(): Record<ErrorType, number> {
    const groups = {} as Record<ErrorType, number>;

    Object.values(ErrorType).forEach(type => {
      groups[type] = 0;
    });

    this.errorHistory.forEach(error => {
      groups[error.type]++;
    });

    return groups;
  }

  private groupErrorsBySeverity(): Record<ErrorSeverity, number> {
    const groups = {} as Record<ErrorSeverity, number>;

    Object.values(ErrorSeverity).forEach(severity => {
      groups[severity] = 0;
    });

    this.errorHistory.forEach(error => {
      groups[error.severity]++;
    });

    return groups;
  }

  private calculateRecoveryRate(): number {
    const totalAttempts = this.recoveryAttempts.size;
    if (totalAttempts === 0) return 0;

    const successfulAttempts = Array.from(
      this.recoveryAttempts.values()
    ).filter(attempt => attempt.success).length;

    return (successfulAttempts / totalAttempts) * 100;
  }

  private calculateAverageRecoveryTime(): number {
    const successfulAttempts = Array.from(
      this.recoveryAttempts.values()
    ).filter(attempt => attempt.success);

    if (successfulAttempts.length === 0) return 0;

    const totalTime = successfulAttempts.reduce((sum, attempt) => {
      return sum + (Date.now() - attempt.startTime);
    }, 0);

    return totalTime / successfulAttempts.length;
  }

  private async sendImmediateReport(error: any) {
    if (!this.config.enableRealTimeReporting) return;

    try {
      await fetch('/api/error-monitoring/immediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error }),
      });
    } catch (reportingError) {
      console.error('Failed to send immediate error report:', reportingError);
    }
  }

  private async sendPeriodicReport() {
    if (!this.config.enableRealTimeReporting) return;

    try {
      const stats = this.getErrorStats();
      const trends = this.getErrorTrends();

      await fetch('/api/error-monitoring/periodic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, trends }),
      });
    } catch (reportingError) {
      console.error('Failed to send periodic error report:', reportingError);
    }
  }

  private loadErrorHistory() {
    try {
      const stored = localStorage.getItem('error-monitor-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.errorHistory = parsed.map((error: any) => ({
          ...error,
          timestamp: new Date(error.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load error history:', error);
    }
  }

  private saveErrorHistory() {
    try {
      localStorage.setItem(
        'error-monitor-history',
        JSON.stringify(this.errorHistory)
      );
    } catch (error) {
      console.error('Failed to save error history:', error);
    }
  }

  private initializePerformanceTracking() {
    // 监听长任务
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.duration > 50) {
              // 长于50ms的任务
              this.recordError(
                {
                  type: ErrorType.UNKNOWN,
                  severity: ErrorSeverity.LOW,
                  message: `Long task detected: ${entry.duration}ms`,
                  timestamp: new Date(),
                  userMessage: '页面响应较慢',
                  recoverable: true,
                  retryable: false,
                } as StandardError,
                {
                  performanceEntry: entry,
                  type: 'long-task',
                }
              );
            }
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Performance monitoring not supported:', error);
      }
    }
  }
}

// 导出单例实例
export const errorMonitor = ErrorMonitor.getInstance();

// 错误监控 Hook
export function useErrorMonitoring() {
  return {
    recordError: (error: StandardError, context?: any) =>
      errorMonitor.recordError(error, context),
    getStats: () => errorMonitor.getErrorStats(),
    getTrends: (timeRange?: number) => errorMonitor.getErrorTrends(timeRange),
    exportReport: () => errorMonitor.exportErrorReport(),
  };
}
