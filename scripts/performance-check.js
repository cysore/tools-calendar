#!/usr/bin/env node

/**
 * Performance Check Script
 * Monitors application performance metrics and alerts on issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  url: process.env.MONITORING_URL || 'https://localhost:3000',
  thresholds: {
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5%
    memoryUsage: 80, // 80%
    cpuUsage: 70, // 70%
  },
  alertWebhook: process.env.ALERT_WEBHOOK_URL,
  logFile: path.join(__dirname, '../logs/performance.log'),
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      responseTime: [],
      errorCount: 0,
      totalRequests: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };
  }

  async checkEndpoint(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, { timeout }, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            responseTime,
            contentLength: data.length,
            headers: res.headers,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
    });
  }

  async checkHealthEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/monitoring/dashboard',
      '/',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${CONFIG.url}${endpoint}`;
        const result = await this.checkEndpoint(url);
        
        results.push({
          endpoint,
          ...result,
          status: 'success',
        });

        this.metrics.responseTime.push(result.responseTime);
        this.metrics.totalRequests++;

        if (result.statusCode >= 400) {
          this.metrics.errorCount++;
        }

      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.message,
          responseTime: CONFIG.thresholds.responseTime + 1000, // Mark as slow
        });

        this.metrics.errorCount++;
        this.metrics.totalRequests++;
      }
    }

    return results;
  }

  async checkSystemMetrics() {
    try {
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      // Check CPU usage (simplified)
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      this.metrics.cpuUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to percentage

      return {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: this.metrics.memoryUsage,
        },
        cpu: {
          percentage: this.metrics.cpuUsage,
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      console.error('Error checking system metrics:', error);
      return null;
    }
  }

  analyzeMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    const errorRate = this.metrics.totalRequests > 0
      ? (this.metrics.errorCount / this.metrics.totalRequests) * 100
      : 0;

    const issues = [];

    // Check response time
    if (avgResponseTime > CONFIG.thresholds.responseTime) {
      issues.push({
        type: 'performance',
        severity: 'warning',
        message: `Average response time (${avgResponseTime.toFixed(2)}ms) exceeds threshold (${CONFIG.thresholds.responseTime}ms)`,
        value: avgResponseTime,
        threshold: CONFIG.thresholds.responseTime,
      });
    }

    // Check error rate
    if (errorRate > CONFIG.thresholds.errorRate) {
      issues.push({
        type: 'reliability',
        severity: 'critical',
        message: `Error rate (${errorRate.toFixed(2)}%) exceeds threshold (${CONFIG.thresholds.errorRate}%)`,
        value: errorRate,
        threshold: CONFIG.thresholds.errorRate,
      });
    }

    // Check memory usage
    if (this.metrics.memoryUsage > CONFIG.thresholds.memoryUsage) {
      issues.push({
        type: 'resource',
        severity: 'warning',
        message: `Memory usage (${this.metrics.memoryUsage.toFixed(2)}%) exceeds threshold (${CONFIG.thresholds.memoryUsage}%)`,
        value: this.metrics.memoryUsage,
        threshold: CONFIG.thresholds.memoryUsage,
      });
    }

    // Check CPU usage
    if (this.metrics.cpuUsage > CONFIG.thresholds.cpuUsage) {
      issues.push({
        type: 'resource',
        severity: 'warning',
        message: `CPU usage (${this.metrics.cpuUsage.toFixed(2)}%) exceeds threshold (${CONFIG.thresholds.cpuUsage}%)`,
        value: this.metrics.cpuUsage,
        threshold: CONFIG.thresholds.cpuUsage,
      });
    }

    return {
      summary: {
        avgResponseTime,
        errorRate,
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage,
        totalRequests: this.metrics.totalRequests,
        errorCount: this.metrics.errorCount,
      },
      issues,
      status: issues.length === 0 ? 'healthy' : 'degraded',
    };
  }

  async sendAlert(issue) {
    if (!CONFIG.alertWebhook) {
      console.warn('No alert webhook configured');
      return;
    }

    const payload = {
      text: `🚨 Performance Alert: ${issue.message}`,
      attachments: [
        {
          color: issue.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Type',
              value: issue.type,
              short: true,
            },
            {
              title: 'Severity',
              value: issue.severity,
              short: true,
            },
            {
              title: 'Current Value',
              value: issue.value.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: issue.threshold.toString(),
              short: true,
            },
          ],
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      // Send webhook (implementation depends on your alerting system)
      console.log('Alert would be sent:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  logResults(results, analysis) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      results,
      analysis,
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Ensure logs directory exists
    const logsDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Append to log file
    fs.appendFileSync(CONFIG.logFile, logLine);

    // Also log to console
    console.log(`[${new Date().toISOString()}] Performance Check Results:`);
    console.log(`Status: ${analysis.status}`);
    console.log(`Average Response Time: ${analysis.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`Error Rate: ${analysis.summary.errorRate.toFixed(2)}%`);
    console.log(`Memory Usage: ${analysis.summary.memoryUsage.toFixed(2)}%`);
    console.log(`CPU Usage: ${analysis.summary.cpuUsage.toFixed(2)}%`);

    if (analysis.issues.length > 0) {
      console.log('\n⚠️  Issues detected:');
      analysis.issues.forEach(issue => {
        console.log(`  - ${issue.message}`);
      });
    } else {
      console.log('\n✅ All metrics within acceptable ranges');
    }
  }

  async run() {
    try {
      console.log('🔍 Starting performance check...');

      // Check endpoints
      const endpointResults = await this.checkHealthEndpoints();

      // Check system metrics
      const systemMetrics = await this.checkSystemMetrics();

      // Analyze results
      const analysis = this.analyzeMetrics();

      // Log results
      this.logResults({
        endpoints: endpointResults,
        system: systemMetrics,
      }, analysis);

      // Send alerts for critical issues
      for (const issue of analysis.issues) {
        if (issue.severity === 'critical') {
          await this.sendAlert(issue);
        }
      }

      // Exit with appropriate code
      process.exit(analysis.status === 'healthy' ? 0 : 1);

    } catch (error) {
      console.error('Performance check failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.run();
}

module.exports = PerformanceMonitor;