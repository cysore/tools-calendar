'use client';

import { ApiError } from '@/hooks/useErrorHandler';
import { logger } from './production-logger';
import { captureError, addBreadcrumb } from './error-tracker';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 10000;
  private defaultRetries: number = 3;
  private defaultRetryDelay: number = 1000;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestConfig = {}
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  private async fetchWithRetry(
    url: string,
    config: RequestConfig = {}
  ): Promise<Response> {
    const {
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      ...fetchConfig
    } = config;

    const startTime = performance.now();
    const method = fetchConfig.method || 'GET';
    let lastError: Error;

    // Add breadcrumb for API call start
    addBreadcrumb({
      category: 'api',
      message: `${method} ${url}`,
      level: 'info',
      data: {
        url,
        method,
        attempt: 1,
        maxRetries: retries,
      },
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, fetchConfig);
        const duration = performance.now() - startTime;

        // Log successful API call
        logger.logApiCall(method, url, duration, response.status, {
          attempt: attempt + 1,
          requestSize: fetchConfig.body ? JSON.stringify(fetchConfig.body).length : 0,
          responseSize: response.headers.get('content-length') || 0,
        });

        // 如果是网络错误或服务器错误，进行重试
        if (response.status >= 500 && attempt < retries) {
          // Log retry attempt
          logger.warn(`API call failed, retrying: ${method} ${url}`, {
            status: response.status,
            attempt: attempt + 1,
            maxRetries: retries,
            duration,
          });

          addBreadcrumb({
            category: 'api',
            message: `${method} ${url} failed, retrying`,
            level: 'warning',
            data: {
              status: response.status,
              attempt: attempt + 1,
              duration,
            },
          });

          throw new Error(`服务器错误 (${response.status})`);
        }

        // Add success breadcrumb
        addBreadcrumb({
          category: 'api',
          message: `${method} ${url} succeeded`,
          level: 'info',
          data: {
            status: response.status,
            duration,
            attempt: attempt + 1,
          },
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
        const duration = performance.now() - startTime;

        // 如果是最后一次尝试，抛出错误
        if (attempt === retries) {
          // Log final failure
          logger.error(`API call failed after ${retries + 1} attempts: ${method} ${url}`, lastError, {
            totalDuration: duration,
            attempts: attempt + 1,
            maxRetries: retries,
          });

          // Capture error for tracking
          captureError(lastError, {
            component: 'api-client',
            action: 'api_request_failed',
            props: {
              url,
              method,
              attempts: attempt + 1,
              totalDuration: duration,
            },
          });

          addBreadcrumb({
            category: 'api',
            message: `${method} ${url} failed permanently`,
            level: 'error',
            data: {
              error: lastError.message,
              attempts: attempt + 1,
              totalDuration: duration,
            },
          });

          throw lastError;
        }

        // Log retry attempt
        logger.warn(`API call attempt ${attempt + 1} failed, retrying: ${method} ${url}`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: retries,
          duration,
        });

        // 等待后重试
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorData: any;

      try {
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { message: await response.text() };
        }
      } catch {
        errorData = { message: '服务器响应格式错误' };
      }

      const apiError: ApiError = {
        code: errorData.error?.code || `HTTP_${response.status}`,
        message:
          errorData.error?.message ||
          errorData.message ||
          this.getStatusMessage(response.status),
        details: errorData.error?.details || errorData.details,
        status: response.status,
      };

      throw apiError;
    }

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data.data || data;
    }

    return response.text() as any;
  }

  private getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '权限不足',
      404: '请求的资源不存在',
      408: '请求超时',
      409: '请求冲突',
      422: '请求数据验证失败',
      429: '请求过于频繁，请稍后重试',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务暂时不可用',
      504: '网关超时',
    };

    return messages[status] || `请求失败 (${status})`;
  }

  private getFullURL(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  async get<T = any>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.fetchWithRetry(this.getFullURL(endpoint), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      ...config,
    });

    return this.handleResponse<T>(response);
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(this.getFullURL(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });

    return this.handleResponse<T>(response);
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(this.getFullURL(endpoint), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(this.getFullURL(endpoint), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      ...config,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const response = await this.fetchWithRetry(this.getFullURL(endpoint), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });

    return this.handleResponse<T>(response);
  }
}

// 创建默认的 API 客户端实例
export const apiClient = new ApiClient();

// 导出类以便创建自定义实例
export { ApiClient };
