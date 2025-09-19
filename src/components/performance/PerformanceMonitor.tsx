'use client';

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformance';
import { apiCache } from '@/lib/performance/api-cache';

interface PerformanceMonitorProps {
  enabled?: boolean;
  showInProduction?: boolean;
}

export function PerformanceMonitor({
  enabled = true,
  showInProduction = false,
}: PerformanceMonitorProps) {
  const { metrics, measureMemory, getCacheStats } = usePerformanceMonitor();
  const [isVisible, setIsVisible] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    maxSize: 0,
    hitRate: 0,
  });

  // 只在开发环境或明确允许的情况下显示
  const shouldShow =
    enabled && (process.env.NODE_ENV === 'development' || showInProduction);

  useEffect(() => {
    if (!shouldShow) return;

    const interval = setInterval(() => {
      measureMemory();
      getCacheStats();
      setCacheStats(apiCache.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [shouldShow, measureMemory, getCacheStats]);

  if (!shouldShow) return null;

  return (
    <>
      {/* 性能监控切换按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="性能监控"
      >
        📊
      </button>

      {/* 性能监控面板 */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">性能监控</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {/* 渲染性能 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-1">渲染性能</h4>
              <div className="bg-gray-50 p-2 rounded">
                <div>最近渲染时间: {metrics.renderTime.toFixed(2)}ms</div>
                <div
                  className={`${metrics.renderTime > 100 ? 'text-red-600' : metrics.renderTime > 50 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  状态:{' '}
                  {metrics.renderTime > 100
                    ? '慢'
                    : metrics.renderTime > 50
                      ? '中等'
                      : '快'}
                </div>
              </div>
            </div>

            {/* 内存使用 */}
            {metrics.memoryUsage && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">内存使用</h4>
                <div className="bg-gray-50 p-2 rounded">
                  <div>JS 堆内存: {metrics.memoryUsage.toFixed(2)} MB</div>
                  <div
                    className={`${metrics.memoryUsage > 100 ? 'text-red-600' : metrics.memoryUsage > 50 ? 'text-yellow-600' : 'text-green-600'}`}
                  >
                    状态:{' '}
                    {metrics.memoryUsage > 100
                      ? '高'
                      : metrics.memoryUsage > 50
                        ? '中等'
                        : '正常'}
                  </div>
                </div>
              </div>
            )}

            {/* 缓存统计 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-1">缓存统计</h4>
              <div className="bg-gray-50 p-2 rounded">
                <div>
                  缓存条目: {cacheStats.size} / {cacheStats.maxSize}
                </div>
                <div>命中率: {(cacheStats.hitRate * 100).toFixed(1)}%</div>
                <button
                  onClick={() => {
                    apiCache.clear();
                    setCacheStats({
                      size: 0,
                      maxSize: cacheStats.maxSize,
                      hitRate: 0,
                    });
                  }}
                  className="mt-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  清空缓存
                </button>
              </div>
            </div>

            {/* 网络状态 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-1">网络状态</h4>
              <div className="bg-gray-50 p-2 rounded">
                <NetworkStatus />
              </div>
            </div>

            {/* 性能建议 */}
            <div>
              <h4 className="font-medium text-gray-700 mb-1">性能建议</h4>
              <div className="bg-gray-50 p-2 rounded text-xs">
                <PerformanceTips
                  renderTime={metrics.renderTime}
                  memoryUsage={metrics.memoryUsage}
                  cacheSize={cacheStats.size}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 网络状态组件
function NetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState<{
    online: boolean;
    effectiveType?: string;
    downlink?: number;
  }>({
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkInfo({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
      });
    };

    const handleOnline = () => updateNetworkInfo();
    const handleOffline = () => updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始更新
    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div>
      <div
        className={`${networkInfo.online ? 'text-green-600' : 'text-red-600'}`}
      >
        状态: {networkInfo.online ? '在线' : '离线'}
      </div>
      {networkInfo.effectiveType && (
        <div>连接类型: {networkInfo.effectiveType}</div>
      )}
      {networkInfo.downlink && <div>下载速度: {networkInfo.downlink} Mbps</div>}
    </div>
  );
}

// 性能建议组件
function PerformanceTips({
  renderTime,
  memoryUsage,
  cacheSize,
}: {
  renderTime: number;
  memoryUsage?: number;
  cacheSize: number;
}) {
  const tips = [];

  if (renderTime > 100) {
    tips.push('渲染时间较长，考虑使用虚拟滚动或分页');
  }

  if (memoryUsage && memoryUsage > 100) {
    tips.push('内存使用较高，检查是否有内存泄漏');
  }

  if (cacheSize > 80) {
    tips.push('缓存条目较多，考虑清理过期缓存');
  }

  if (tips.length === 0) {
    tips.push('性能表现良好！');
  }

  return (
    <ul className="space-y-1">
      {tips.map((tip, index) => (
        <li key={index} className="flex items-start">
          <span className="mr-1">•</span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}
