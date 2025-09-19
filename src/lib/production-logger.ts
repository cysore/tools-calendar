/**
 * Production Logger - Structured logging for production environment
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    memory?: any;
    timing?: any;
  };
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalEntries: number;
  batchSize: number;
  flushInterval: number;
  remoteEndpoint?: string;
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: process.env.NODE_ENV !== 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      enableLocalStorage: true,
      maxLocalEntries: 1000,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      remoteEndpoint: '/api/logs',
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeLogger();
  }

  static getInstance(config?: Partial<LoggerConfig>): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger(config);
    }
    return ProductionLogger.instance;
  }

  private initializeLogger() {
    // Start flush timer
    if (this.config.enableRemote) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Handle visibility change for mobile
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.sessionId,
      context,
    };

    // Add user context if available
    try {
      const userId = this.getCurrentUserId();
      if (userId) {
        entry.userId = userId;
      }
    } catch {
      // Ignore errors getting user ID
    }

    // Add performance metrics for important logs
    if (level >= LogLevel.WARN) {
      entry.performance = this.getPerformanceMetrics();
    }

    return entry;
  }

  private getCurrentUserId(): string | undefined {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth-token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.sub || payload.userId;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  private getPerformanceMetrics() {
    if (typeof window === 'undefined' || !window.performance) {
      return undefined;
    }

    try {
      const memory = (performance as any).memory;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        memory: memory ? {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        } : undefined,
        timing: navigation ? {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        } : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private writeToConsole(entry: LogEntry) {
    if (!this.config.enableConsole) return;

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const levelName = levelNames[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();

    const prefix = `[${timestamp}] ${levelName}:`;
    const message = entry.message;
    const context = entry.context ? JSON.stringify(entry.context, null, 2) : '';

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, message, context);
        if (entry.error?.stack) {
          console.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);

    // Auto-flush if buffer is full
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private saveToLocalStorage(entry: LogEntry) {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const key = 'production-logs';
      const stored = localStorage.getItem(key);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];

      logs.push(entry);

      // Keep only recent entries
      if (logs.length > this.config.maxLocalEntries) {
        logs.splice(0, logs.length - this.config.maxLocalEntries);
      }

      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log to localStorage:', error);
    }
  }

  public debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  public info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
    this.saveToLocalStorage(entry);
  }

  public warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
    this.saveToLocalStorage(entry);
  }

  public error(message: string, error?: Error, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.writeToConsole(entry);
    this.addToBuffer(entry);
    this.saveToLocalStorage(entry);

    // Immediate flush for errors
    if (this.config.enableRemote) {
      this.flush();
    }
  }

  public critical(message: string, error?: Error, context?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, context);
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.writeToConsole(entry);
    this.addToBuffer(entry);
    this.saveToLocalStorage(entry);

    // Immediate flush for critical errors
    if (this.config.enableRemote) {
      this.flush();
    }
  }

  public logApiCall(
    method: string,
    url: string,
    duration: number,
    status: number,
    context?: Record<string, any>
  ) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${method} ${url} - ${status} (${duration}ms)`;

    const entry = this.createLogEntry(level, message, {
      ...context,
      api: {
        method,
        url,
        duration,
        status,
      },
    });

    entry.duration = duration;

    this.writeToConsole(entry);
    this.addToBuffer(entry);
    
    if (level >= LogLevel.WARN) {
      this.saveToLocalStorage(entry);
    }
  }

  public logUserAction(
    action: string,
    component: string,
    context?: Record<string, any>
  ) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, `User action: ${action}`, context);
    entry.component = component;
    entry.action = action;

    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  public async flush(): Promise<void> {
    if (!this.config.enableRemote || this.logBuffer.length === 0) {
      return;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        // Put logs back in buffer if send failed
        this.logBuffer.unshift(...logsToSend);
        console.error('Failed to send logs to server:', response.statusText);
      }
    } catch (error) {
      // Put logs back in buffer if send failed
      this.logBuffer.unshift(...logsToSend);
      console.error('Failed to send logs to server:', error);
    }
  }

  public getLocalLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('production-logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public clearLocalLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('production-logs');
    } catch (error) {
      console.error('Failed to clear local logs:', error);
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const logger = ProductionLogger.getInstance();

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, error, context),
  critical: (message: string, error?: Error, context?: Record<string, any>) => logger.critical(message, error, context),
  api: (method: string, url: string, duration: number, status: number, context?: Record<string, any>) => 
    logger.logApiCall(method, url, duration, status, context),
  userAction: (action: string, component: string, context?: Record<string, any>) => 
    logger.logUserAction(action, component, context),
};