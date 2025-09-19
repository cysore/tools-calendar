/**
 * E2E tests for calendar and event management functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Calendar and Events E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to calendar
    await page.goto('/auth/login');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('SecurePassword123!');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Navigate to calendar view
    await page.getByText('日历').click();
    await expect(page.getByTestId('calendar-view')).toBeVisible();
  });

  test.describe('Calendar Views', () => {
    test('should switch between calendar views', async ({ page }) => {
      // Verify default month view
      await expect(page.getByTestId('calendar-month-view')).toBeVisible();
      await expect(page.getByRole('button', { name: '月视图' })).toHaveClass(
        /active/
      );

      // Switch to week view
      await page.getByRole('button', { name: '周视图' }).click();
      await expect(page.getByTestId('calendar-week-view')).toBeVisible();
      await expect(page.getByRole('button', { name: '周视图' })).toHaveClass(
        /active/
      );

      // Switch to list view
      await page.getByRole('button', { name: '列表视图' }).click();
      await expect(page.getByTestId('calendar-list-view')).toBeVisible();
      await expect(page.getByRole('button', { name: '列表视图' })).toHaveClass(
        /active/
      );

      // Switch back to month view
      await page.getByRole('button', { name: '月视图' }).click();
      await expect(page.getByTestId('calendar-month-view')).toBeVisible();
    });

    test('should navigate between months', async ({ page }) => {
      // Get current month
      const currentMonth = await page
        .getByTestId('current-month')
        .textContent();

      // Navigate to next month
      await page.getByRole('button', { name: '下个月' }).click();
      const nextMonth = await page.getByTestId('current-month').textContent();
      expect(nextMonth).not.toBe(currentMonth);

      // Navigate to previous month
      await page.getByRole('button', { name: '上个月' }).click();
      const prevMonth = await page.getByTestId('current-month').textContent();
      expect(prevMonth).toBe(currentMonth);
    });

    test('should show today button and navigate to current date', async ({
      page,
    }) => {
      // Navigate to a different month
      await page.getByRole('button', { name: '下个月' }).click();
      await page.getByRole('button', { name: '下个月' }).click();

      // Click today button
      await page.getByRole('button', { name: '今天' }).click();

      // Should navigate back to current month
      const today = new Date();
      const expectedMonth = today.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
      });
      await expect(page.getByTestId('current-month')).toHaveText(expectedMonth);
    });
  });

  test.describe('Event Creation', () => {
    test('should create a new event by clicking on a date', async ({
      page,
    }) => {
      // Click on a date cell to create event
      await page.getByTestId('calendar-date-15').click();

      // Verify event modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: '创建事件' })
      ).toBeVisible();

      // Fill event form
      await page.getByLabel('事件标题').fill('Team Meeting');
      await page.getByLabel('开始时间').fill('10:00');
      await page.getByLabel('结束时间').fill('11:00');
      await page.getByLabel('地点').fill('Conference Room A');
      await page.getByLabel('描述').fill('Weekly team sync meeting');

      // Select category
      await page.getByLabel('分类').selectOption('meeting');

      // Select color
      await page.getByTestId('color-picker').click();
      await page.getByTestId('color-blue').click();

      // Save event
      await page.getByRole('button', { name: '保存事件' }).click();

      // Verify event was created
      await expect(page.getByText('事件创建成功')).toBeVisible();
      await expect(page.getByText('Team Meeting')).toBeVisible();
    });

    test('should create an all-day event', async ({ page }) => {
      await page.getByRole('button', { name: '创建事件' }).click();

      // Fill basic info
      await page.getByLabel('事件标题').fill('Company Holiday');

      // Enable all-day option
      await page.getByLabel('全天事件').check();

      // Verify time fields are hidden/disabled
      await expect(page.getByLabel('开始时间')).not.toBeVisible();
      await expect(page.getByLabel('结束时间')).not.toBeVisible();

      // Select category
      await page.getByLabel('分类').selectOption('reminder');

      // Save event
      await page.getByRole('button', { name: '保存事件' }).click();

      // Verify all-day event appears correctly
      await expect(page.getByText('Company Holiday')).toBeVisible();
      await expect(page.getByTestId('all-day-event')).toBeVisible();
    });

    test('should validate event form fields', async ({ page }) => {
      await page.getByRole('button', { name: '创建事件' }).click();

      // Try to save without required fields
      await page.getByRole('button', { name: '保存事件' }).click();

      // Verify validation errors
      await expect(page.getByText('请输入事件标题')).toBeVisible();

      // Fill title but set invalid time range
      await page.getByLabel('事件标题').fill('Test Event');
      await page.getByLabel('开始时间').fill('14:00');
      await page.getByLabel('结束时间').fill('13:00');

      await page.getByRole('button', { name: '保存事件' }).click();

      // Verify time validation error
      await expect(page.getByText('结束时间不能早于开始时间')).toBeVisible();
    });

    test('should handle event creation errors', async ({ page }) => {
      // Intercept event creation API to return error
      await page.route('/api/teams/*/events', route => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: '权限不足，无法创建事件' },
          }),
        });
      });

      await page.getByRole('button', { name: '创建事件' }).click();
      await page.getByLabel('事件标题').fill('Test Event');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Verify error message
      await expect(page.getByText('权限不足，无法创建事件')).toBeVisible();
    });
  });

  test.describe('Event Management', () => {
    test('should view event details', async ({ page }) => {
      // Click on an existing event
      await page.getByTestId('event-item').first().click();

      // Verify event details modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: '事件详情' })
      ).toBeVisible();

      // Verify event information is displayed
      await expect(page.getByText('Team Meeting')).toBeVisible();
      await expect(page.getByText('Conference Room A')).toBeVisible();
      await expect(page.getByText('10:00 - 11:00')).toBeVisible();
    });

    test('should edit an existing event', async ({ page }) => {
      // Click on an event to open details
      await page.getByTestId('event-item').first().click();

      // Click edit button
      await page.getByRole('button', { name: '编辑事件' }).click();

      // Verify form is pre-filled
      await expect(page.getByDisplayValue('Team Meeting')).toBeVisible();

      // Update event details
      await page.getByLabel('事件标题').fill('Updated Team Meeting');
      await page.getByLabel('地点').fill('Conference Room B');

      // Save changes
      await page.getByRole('button', { name: '保存更改' }).click();

      // Verify event was updated
      await expect(page.getByText('事件更新成功')).toBeVisible();
      await expect(page.getByText('Updated Team Meeting')).toBeVisible();
    });

    test('should delete an event', async ({ page }) => {
      // Click on an event
      await page.getByTestId('event-item').first().click();

      // Setup confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      // Click delete button
      await page.getByRole('button', { name: '删除事件' }).click();

      // Verify event was deleted
      await expect(page.getByText('事件删除成功')).toBeVisible();

      // Verify event no longer appears in calendar
      await expect(page.getByText('Team Meeting')).not.toBeVisible();
    });

    test('should prevent unauthorized event modifications', async ({
      page,
    }) => {
      // Intercept API to simulate permission error
      await page.route('/api/teams/*/events/*', route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: '只有事件创建者或团队管理员可以编辑此事件' },
            }),
          });
        } else {
          route.continue();
        }
      });

      // Try to edit an event
      await page.getByTestId('event-item').first().click();
      await page.getByRole('button', { name: '编辑事件' }).click();
      await page.getByLabel('事件标题').fill('Unauthorized Edit');
      await page.getByRole('button', { name: '保存更改' }).click();

      // Verify permission error
      await expect(
        page.getByText('只有事件创建者或团队管理员可以编辑此事件')
      ).toBeVisible();
    });
  });

  test.describe('Event Filtering and Search', () => {
    test('should filter events by category', async ({ page }) => {
      // Verify all events are shown initially
      const allEventsCount = await page.getByTestId('event-item').count();
      expect(allEventsCount).toBeGreaterThan(0);

      // Filter by meeting category
      await page.getByLabel('分类筛选').selectOption('meeting');

      // Verify only meeting events are shown
      const meetingEvents = page
        .getByTestId('event-item')
        .filter({ hasText: '会议' });
      await expect(meetingEvents.first()).toBeVisible();

      // Filter by task category
      await page.getByLabel('分类筛选').selectOption('task');

      // Verify only task events are shown
      const taskEvents = page
        .getByTestId('event-item')
        .filter({ hasText: '任务' });
      const taskCount = await taskEvents.count();

      if (taskCount > 0) {
        await expect(taskEvents.first()).toBeVisible();
      }

      // Reset filter
      await page.getByLabel('分类筛选').selectOption('all');

      // Verify all events are shown again
      const resetEventsCount = await page.getByTestId('event-item').count();
      expect(resetEventsCount).toBe(allEventsCount);
    });

    test('should search events by title', async ({ page }) => {
      // Enter search term
      await page.getByLabel('搜索事件').fill('Meeting');

      // Verify only matching events are shown
      await expect(page.getByText('Team Meeting')).toBeVisible();

      // Verify non-matching events are hidden
      const visibleEvents = await page.getByTestId('event-item').count();
      const allEvents = await page.getByTestId('event-item').all();

      for (const event of allEvents) {
        const text = await event.textContent();
        if (text && !text.includes('Meeting')) {
          await expect(event).not.toBeVisible();
        }
      }

      // Clear search
      await page.getByLabel('搜索事件').fill('');

      // Verify all events are shown again
      await expect(page.getByTestId('event-item').first()).toBeVisible();
    });

    test('should filter events by date range', async ({ page }) => {
      // Switch to list view for better date range testing
      await page.getByRole('button', { name: '列表视图' }).click();

      // Set date range filter
      await page.getByLabel('开始日期').fill('2024-01-01');
      await page.getByLabel('结束日期').fill('2024-01-31');

      // Apply filter
      await page.getByRole('button', { name: '应用筛选' }).click();

      // Verify only events in date range are shown
      const eventDates = await page.getByTestId('event-date').allTextContents();
      for (const dateText of eventDates) {
        const eventDate = new Date(dateText);
        expect(eventDate.getTime()).toBeGreaterThanOrEqual(
          new Date('2024-01-01').getTime()
        );
        expect(eventDate.getTime()).toBeLessThanOrEqual(
          new Date('2024-01-31').getTime()
        );
      }
    });
  });

  test.describe('Calendar Integration Features', () => {
    test('should show event tooltips on hover', async ({ page }) => {
      // Hover over an event
      await page.getByTestId('event-item').first().hover();

      // Verify tooltip appears with event details
      await expect(page.getByTestId('event-tooltip')).toBeVisible();
      await expect(page.getByTestId('event-tooltip')).toContainText(
        'Team Meeting'
      );
      await expect(page.getByTestId('event-tooltip')).toContainText(
        '10:00 - 11:00'
      );
    });

    test('should handle drag and drop for event rescheduling', async ({
      page,
    }) => {
      // Get initial event position
      const event = page.getByTestId('event-item').first();
      const initialDate = await event.getAttribute('data-date');

      // Drag event to a different date
      const targetDate = page.getByTestId('calendar-date-20');
      await event.dragTo(targetDate);

      // Verify event moved to new date
      const updatedEvent = page.getByTestId('event-item').first();
      const newDate = await updatedEvent.getAttribute('data-date');
      expect(newDate).not.toBe(initialDate);

      // Verify update confirmation
      await expect(page.getByText('事件时间已更新')).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Focus on calendar
      await page.getByTestId('calendar-view').focus();

      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');

      // Press Enter to create event on focused date
      await page.keyboard.press('Enter');

      // Verify event creation modal opens
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('Mobile Calendar Experience', () => {
    test('should work properly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile calendar layout
      await expect(page.getByTestId('mobile-calendar')).toBeVisible();

      // Test mobile event creation
      await page.getByTestId('mobile-add-event-btn').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Verify form is mobile-optimized
      const dialog = page.getByRole('dialog');
      const boundingBox = await dialog.boundingBox();
      expect(boundingBox?.width).toBeLessThan(375);
    });

    test('should support touch gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Test swipe navigation
      const calendar = page.getByTestId('calendar-view');

      // Swipe left to go to next month
      await calendar.touchStart([{ x: 300, y: 300 }]);
      await calendar.touchMove([{ x: 100, y: 300 }]);
      await calendar.touchEnd();

      // Verify month changed
      await expect(page.getByTestId('current-month')).not.toHaveText(
        '2024年1月'
      );

      // Swipe right to go to previous month
      await calendar.touchStart([{ x: 100, y: 300 }]);
      await calendar.touchMove([{ x: 300, y: 300 }]);
      await calendar.touchEnd();

      // Verify month changed back
      await expect(page.getByTestId('current-month')).toHaveText('2024年1月');
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load calendar efficiently with many events', async ({
      page,
    }) => {
      // Navigate to a month with many events
      await page.goto('/dashboard?month=2024-12'); // Assume December has many events

      // Measure loading time
      const startTime = Date.now();
      await expect(page.getByTestId('calendar-view')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Verify events are displayed
      const eventCount = await page.getByTestId('event-item').count();
      expect(eventCount).toBeGreaterThan(0);
    });

    test('should show loading states during operations', async ({ page }) => {
      // Create event and check loading state
      await page.getByRole('button', { name: '创建事件' }).click();
      await page.getByLabel('事件标题').fill('Loading Test Event');

      // Click save and immediately check for loading
      await page.getByRole('button', { name: '保存事件' }).click();

      // Should show loading state
      await expect(page.getByText('保存中...')).toBeVisible();
    });

    test('should handle offline scenarios gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true);

      // Try to create an event
      await page.getByRole('button', { name: '创建事件' }).click();
      await page.getByLabel('事件标题').fill('Offline Event');
      await page.getByRole('button', { name: '保存事件' }).click();

      // Should show offline message
      await expect(
        page.getByText('当前离线，事件将在网络恢复后同步')
      ).toBeVisible();

      // Go back online
      await page.context().setOffline(false);

      // Should sync the event
      await expect(page.getByText('事件同步成功')).toBeVisible();
    });
  });
});
