/**
 * E2E tests for iCalendar subscription functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Subscription Features E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to team settings
    await page.goto('/auth/login');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('SecurePassword123!');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Subscription Management', () => {
    test('should display team subscription settings', async ({ page }) => {
      // Navigate to subscription settings
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Verify subscription settings page
      await expect(
        page.getByRole('heading', { name: '日历订阅' })
      ).toBeVisible();
      await expect(page.getByText('订阅链接')).toBeVisible();

      // Verify subscription URL is displayed
      const subscriptionUrl = page.getByTestId('subscription-url');
      await expect(subscriptionUrl).toBeVisible();

      const urlText = await subscriptionUrl.textContent();
      expect(urlText).toMatch(
        /^https?:\/\/.+\/api\/teams\/.+\/subscription\/.+$/
      );
    });

    test('should copy subscription URL to clipboard', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Grant clipboard permissions
      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);

      // Click copy button
      await page.getByRole('button', { name: '复制链接' }).click();

      // Verify success message
      await expect(page.getByText('订阅链接已复制到剪贴板')).toBeVisible();

      // Verify clipboard content
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      expect(clipboardText).toMatch(
        /^https?:\/\/.+\/api\/teams\/.+\/subscription\/.+$/
      );
    });

    test('should regenerate subscription key', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Get original subscription URL
      const originalUrl = await page
        .getByTestId('subscription-url')
        .textContent();

      // Setup confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      // Click regenerate button
      await page.getByRole('button', { name: '重新生成链接' }).click();

      // Verify confirmation dialog appeared
      await expect(page.getByText('订阅链接已重新生成')).toBeVisible();

      // Verify URL changed
      const newUrl = await page.getByTestId('subscription-url').textContent();
      expect(newUrl).not.toBe(originalUrl);
      expect(newUrl).toMatch(
        /^https?:\/\/.+\/api\/teams\/.+\/subscription\/.+$/
      );
    });

    test('should show subscription tutorial', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Verify tutorial sections are present
      await expect(page.getByText('如何订阅')).toBeVisible();
      await expect(page.getByText('iOS 日历')).toBeVisible();
      await expect(page.getByText('Google Calendar')).toBeVisible();
      await expect(page.getByText('Outlook')).toBeVisible();

      // Click on iOS tutorial
      await page.getByText('iOS 日历').click();

      // Verify iOS instructions are shown
      await expect(page.getByText('在 iOS 设备上订阅日历')).toBeVisible();
      await expect(page.getByText('1. 打开"设置"应用')).toBeVisible();
      await expect(page.getByText('2. 点击"日历"')).toBeVisible();

      // Click on Google Calendar tutorial
      await page.getByText('Google Calendar').click();

      // Verify Google Calendar instructions
      await expect(page.getByText('在 Google Calendar 中订阅')).toBeVisible();
      await expect(page.getByText('1. 打开 Google Calendar')).toBeVisible();
      await expect(page.getByText('2. 点击左侧的"+"按钮')).toBeVisible();
    });
  });

  test.describe('Event Export', () => {
    test('should export team events as ICS file', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Setup download handler
      const downloadPromise = page.waitForDownload();

      // Click export button
      await page.getByRole('button', { name: '导出本月事件' }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toMatch(
        /team-.+-events-\d{4}-\d{2}\.ics$/
      );

      // Verify file content
      const path = await download.path();
      expect(path).toBeTruthy();
    });

    test('should export events for custom date range', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Set custom date range
      await page.getByLabel('开始日期').fill('2024-01-01');
      await page.getByLabel('结束日期').fill('2024-01-31');

      // Setup download handler
      const downloadPromise = page.waitForDownload();

      // Click export button
      await page.getByRole('button', { name: '导出选定范围' }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(
        /team-.+-events-custom\.ics$/
      );
    });

    test('should export individual event', async ({ page }) => {
      // Navigate to calendar first
      await page.getByText('日历').click();

      // Click on an event
      await page.getByTestId('event-item').first().click();

      // Setup download handler
      const downloadPromise = page.waitForDownload();

      // Click export button in event modal
      await page.getByRole('button', { name: '导出事件' }).click();

      // Wait for download
      const download = await downloadPromise;

      // Verify single event export
      expect(download.suggestedFilename()).toMatch(/event-.+\.ics$/);
    });

    test('should handle export errors gracefully', async ({ page }) => {
      // Intercept export API to return error
      await page.route('/api/teams/*/export*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: '导出失败，请稍后重试' },
          }),
        });
      });

      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      // Try to export
      await page.getByRole('button', { name: '导出本月事件' }).click();

      // Verify error message
      await expect(page.getByText('导出失败，请稍后重试')).toBeVisible();
    });
  });

  test.describe('Subscription URL Functionality', () => {
    test('should serve valid iCalendar data from subscription URL', async ({
      page,
      request,
    }) => {
      // Get subscription URL from settings
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      expect(subscriptionUrl).toBeTruthy();

      // Make request to subscription URL
      const response = await request.get(subscriptionUrl!);

      // Verify response
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/calendar');

      // Verify iCalendar format
      const content = await response.text();
      expect(content).toMatch(/^BEGIN:VCALENDAR/);
      expect(content).toMatch(/END:VCALENDAR$/);
      expect(content).toContain('VERSION:2.0');
      expect(content).toContain('PRODID:');
    });

    test('should include team events in subscription feed', async ({
      page,
      request,
    }) => {
      // First create a test event
      await page.getByText('日历').click();
      await page.getByRole('button', { name: '创建事件' }).click();

      await page.getByLabel('事件标题').fill('Subscription Test Event');
      await page.getByLabel('开始时间').fill('10:00');
      await page.getByLabel('结束时间').fill('11:00');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Get subscription URL
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();

      // Fetch subscription feed
      const response = await request.get(subscriptionUrl!);
      const content = await response.text();

      // Verify event is included
      expect(content).toContain('Subscription Test Event');
      expect(content).toContain('BEGIN:VEVENT');
      expect(content).toContain('END:VEVENT');
    });

    test('should handle invalid subscription keys', async ({
      page,
      request,
    }) => {
      // Try to access subscription with invalid key
      const invalidUrl = '/api/teams/test-team/subscription/invalid-key';
      const response = await request.get(invalidUrl);

      // Should return 404 or 403
      expect([403, 404]).toContain(response.status());
    });

    test('should update subscription feed when events change', async ({
      page,
      request,
    }) => {
      // Get initial subscription content
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const initialResponse = await request.get(subscriptionUrl!);
      const initialContent = await initialResponse.text();

      // Create a new event
      await page.getByText('日历').click();
      await page.getByRole('button', { name: '创建事件' }).click();

      await page.getByLabel('事件标题').fill('New Dynamic Event');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Fetch updated subscription content
      const updatedResponse = await request.get(subscriptionUrl!);
      const updatedContent = await updatedResponse.text();

      // Verify new event appears in feed
      expect(updatedContent).toContain('New Dynamic Event');
      expect(updatedContent).not.toBe(initialContent);
    });
  });

  test.describe('Subscription Security', () => {
    test('should require valid subscription key', async ({ page, request }) => {
      // Try to access subscription without key
      const response = await request.get('/api/teams/test-team/subscription/');
      expect(response.status()).toBe(404);
    });

    test('should not expose sensitive information in subscription feed', async ({
      page,
      request,
    }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const response = await request.get(subscriptionUrl!);
      const content = await response.text();

      // Should not contain sensitive data
      expect(content).not.toContain('password');
      expect(content).not.toContain('token');
      expect(content).not.toContain('secret');
      expect(content).not.toContain('@'); // No email addresses
    });

    test('should invalidate old subscription URLs after regeneration', async ({
      page,
      request,
    }) => {
      // Get original subscription URL
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const originalUrl = await page
        .getByTestId('subscription-url')
        .textContent();

      // Regenerate subscription key
      page.on('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: '重新生成链接' }).click();

      // Try to access old URL
      const response = await request.get(originalUrl!);
      expect([403, 404]).toContain(response.status());

      // Verify new URL works
      const newUrl = await page.getByTestId('subscription-url').textContent();
      const newResponse = await request.get(newUrl!);
      expect(newResponse.status()).toBe(200);
    });
  });

  test.describe('Cross-Platform Compatibility', () => {
    test('should generate RFC-compliant iCalendar format', async ({
      page,
      request,
    }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const response = await request.get(subscriptionUrl!);
      const content = await response.text();

      // Verify RFC 5545 compliance
      expect(content).toMatch(/^BEGIN:VCALENDAR\r?\n/);
      expect(content).toMatch(/\r?\nEND:VCALENDAR\r?\n?$/);
      expect(content).toContain('VERSION:2.0');
      expect(content).toContain('CALSCALE:GREGORIAN');

      // Verify proper line folding (lines should not exceed 75 characters)
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        if (!line.startsWith(' ') && !line.startsWith('\t')) {
          expect(line.length).toBeLessThanOrEqual(75);
        }
      }
    });

    test('should handle timezone information correctly', async ({
      page,
      request,
    }) => {
      // Create an event with specific timezone
      await page.getByText('日历').click();
      await page.getByRole('button', { name: '创建事件' }).click();

      await page.getByLabel('事件标题').fill('Timezone Test Event');
      await page.getByLabel('开始时间').fill('14:00');
      await page.getByLabel('结束时间').fill('15:00');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Get subscription feed
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const response = await request.get(subscriptionUrl!);
      const content = await response.text();

      // Verify timezone handling
      expect(content).toMatch(/DTSTART[;:].*T\d{6}Z?/);
      expect(content).toMatch(/DTEND[;:].*T\d{6}Z?/);
    });

    test('should handle special characters in event data', async ({
      page,
      request,
    }) => {
      // Create event with special characters
      await page.getByText('日历').click();
      await page.getByRole('button', { name: '创建事件' }).click();

      await page
        .getByLabel('事件标题')
        .fill('Test Event with "Quotes" & Symbols');
      await page
        .getByLabel('描述')
        .fill('Description with\nline breaks and émojis 🎉');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Get subscription feed
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const response = await request.get(subscriptionUrl!);
      const content = await response.text();

      // Verify proper escaping
      expect(content).toContain('Test Event with \\"Quotes\\" & Symbols');
      expect(content).toContain('Description with\\nline breaks');
    });
  });

  test.describe('Performance and Caching', () => {
    test('should handle large number of events efficiently', async ({
      page,
      request,
    }) => {
      // This test assumes there are many events in the system
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();

      // Measure response time
      const startTime = Date.now();
      const response = await request.get(subscriptionUrl!);
      const responseTime = Date.now() - startTime;

      // Should respond within reasonable time (5 seconds)
      expect(responseTime).toBeLessThan(5000);
      expect(response.status()).toBe(200);

      // Verify content is not empty
      const content = await response.text();
      expect(content.length).toBeGreaterThan(100);
    });

    test('should include proper caching headers', async ({ page, request }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('订阅设置').click();

      const subscriptionUrl = await page
        .getByTestId('subscription-url')
        .textContent();
      const response = await request.get(subscriptionUrl!);

      // Verify caching headers
      const headers = response.headers();
      expect(headers['cache-control']).toBeTruthy();
      expect(headers['etag'] || headers['last-modified']).toBeTruthy();
    });
  });
});
