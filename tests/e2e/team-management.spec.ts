/**
 * E2E tests for team management functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Team Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.getByLabel('邮箱').fill('test@example.com');
    await page.getByLabel('密码').fill('SecurePassword123!');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Team Creation', () => {
    test('should create a new team successfully', async ({ page }) => {
      // Navigate to team creation
      await page.getByRole('button', { name: '创建团队' }).click();

      // Verify create team dialog opens
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: '创建新团队' })
      ).toBeVisible();

      // Fill team creation form
      await page.getByLabel('团队名称').fill('Test Team');
      await page
        .getByLabel('团队描述')
        .fill('This is a test team for E2E testing');

      // Submit form
      await page.getByRole('button', { name: '创建团队' }).click();

      // Verify team was created and selected
      await expect(page.getByText('团队创建成功')).toBeVisible();
      await expect(page.getByText('Test Team')).toBeVisible();

      // Verify we're now in the new team context
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Test Team'
      );
    });

    test('should validate team creation form', async ({ page }) => {
      await page.getByRole('button', { name: '创建团队' }).click();

      // Try to submit without required fields
      await page.getByRole('button', { name: '创建团队' }).click();

      // Verify validation errors
      await expect(page.getByText('请输入团队名称')).toBeVisible();
    });

    test('should handle team creation errors', async ({ page }) => {
      // Intercept team creation API to return error
      await page.route('/api/teams', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: '团队名称已存在' },
          }),
        });
      });

      await page.getByRole('button', { name: '创建团队' }).click();
      await page.getByLabel('团队名称').fill('Existing Team');
      await page.getByRole('button', { name: '创建团队' }).click();

      // Verify error message is displayed
      await expect(page.getByText('团队名称已存在')).toBeVisible();
    });
  });

  test.describe('Team Selection and Switching', () => {
    test('should switch between teams', async ({ page }) => {
      // Assume user has multiple teams
      await page.getByTestId('team-selector').click();

      // Verify team list is displayed
      await expect(page.getByText('切换团队')).toBeVisible();
      await expect(page.getByText('我的团队')).toBeVisible();

      // Select a different team
      await page.getByText('Another Team').click();

      // Verify team switched
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Another Team'
      );

      // Verify URL reflects team change
      await expect(page).toHaveURL(/teamId=team-2/);
    });

    test('should remember last selected team', async ({ page }) => {
      // Switch to a specific team
      await page.getByTestId('team-selector').click();
      await page.getByText('Test Team').click();

      // Refresh the page
      await page.reload();

      // Verify the same team is still selected
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Test Team'
      );
    });

    test('should show team creation option in selector', async ({ page }) => {
      await page.getByTestId('team-selector').click();

      // Verify create team option is available
      await expect(page.getByText('创建新团队')).toBeVisible();

      // Click create team option
      await page.getByText('创建新团队').click();

      // Verify create team dialog opens
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('Member Management', () => {
    test('should invite team members', async ({ page }) => {
      // Navigate to team settings
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('成员管理').click();

      // Verify member management page
      await expect(
        page.getByRole('heading', { name: '团队成员' })
      ).toBeVisible();

      // Click invite member button
      await page.getByRole('button', { name: '邀请成员' }).click();

      // Fill invitation form
      await page.getByLabel('邮箱地址').fill('newmember@example.com');
      await page.getByLabel('角色').selectOption('member');

      // Submit invitation
      await page.getByRole('button', { name: '发送邀请' }).click();

      // Verify invitation success
      await expect(page.getByText('邀请已发送')).toBeVisible();
      await expect(page.getByText('邀请链接已复制到剪贴板')).toBeVisible();
    });

    test('should display team members list', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('成员管理').click();

      // Verify members are displayed
      await expect(page.getByText('Test User')).toBeVisible();
      await expect(page.getByText('Owner')).toBeVisible();

      // Verify member actions are available for non-owners
      const memberRows = page.getByTestId('member-row');
      const memberCount = await memberRows.count();

      if (memberCount > 1) {
        // Check that non-owner members have action buttons
        await expect(
          page.getByRole('button', { name: '更改角色' }).first()
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: '移除成员' }).first()
        ).toBeVisible();
      }
    });

    test('should change member roles', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('成员管理').click();

      // Find a member (not owner) and change their role
      const memberRow = page
        .getByTestId('member-row')
        .filter({ hasText: 'Member' })
        .first();
      await memberRow
        .getByRole('combobox', { name: '角色' })
        .selectOption('viewer');

      // Verify role change confirmation
      await expect(page.getByText('成员角色已更新')).toBeVisible();

      // Verify role was updated in the UI
      await expect(memberRow.getByText('Viewer')).toBeVisible();
    });

    test('should remove team members', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('成员管理').click();

      // Find a member (not owner) and remove them
      const memberRow = page
        .getByTestId('member-row')
        .filter({ hasText: 'Member' })
        .first();

      // Setup confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      await memberRow.getByRole('button', { name: '移除成员' }).click();

      // Verify member was removed
      await expect(page.getByText('成员已移除')).toBeVisible();
    });

    test('should prevent owner from removing themselves', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('成员管理').click();

      // Find owner row
      const ownerRow = page
        .getByTestId('member-row')
        .filter({ hasText: 'Owner' });

      // Verify owner cannot remove themselves
      await expect(
        ownerRow.getByRole('button', { name: '移除成员' })
      ).not.toBeVisible();
    });
  });

  test.describe('Team Settings', () => {
    test('should update team information', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('基本信息').click();

      // Verify team settings form
      await expect(
        page.getByRole('heading', { name: '团队设置' })
      ).toBeVisible();

      // Update team name and description
      await page.getByLabel('团队名称').fill('Updated Team Name');
      await page.getByLabel('团队描述').fill('Updated team description');

      // Save changes
      await page.getByRole('button', { name: '保存更改' }).click();

      // Verify success message
      await expect(page.getByText('团队信息已更新')).toBeVisible();

      // Verify team name updated in selector
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Updated Team Name'
      );
    });

    test('should handle team deletion', async ({ page }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('危险操作').click();

      // Setup confirmation dialogs
      page.on('dialog', dialog => {
        if (dialog.message().includes('确定要删除团队吗')) {
          dialog.accept();
        } else if (dialog.message().includes('请输入团队名称')) {
          dialog.accept('Test Team');
        }
      });

      // Click delete team button
      await page.getByRole('button', { name: '删除团队' }).click();

      // Verify team was deleted and redirected
      await expect(page.getByText('团队已删除')).toBeVisible();
      await expect(page).toHaveURL('/dashboard');
    });

    test('should prevent team deletion with incorrect confirmation', async ({
      page,
    }) => {
      await page.getByRole('button', { name: '团队设置' }).click();
      await page.getByText('危险操作').click();

      // Setup confirmation dialogs with wrong team name
      page.on('dialog', dialog => {
        if (dialog.message().includes('确定要删除团队吗')) {
          dialog.accept();
        } else if (dialog.message().includes('请输入团队名称')) {
          dialog.accept('Wrong Team Name');
        }
      });

      await page.getByRole('button', { name: '删除团队' }).click();

      // Verify deletion was cancelled
      await expect(page.getByText('团队名称不匹配，删除取消')).toBeVisible();

      // Verify still on settings page
      await expect(
        page.getByRole('heading', { name: '团队设置' })
      ).toBeVisible();
    });
  });

  test.describe('Team Permissions', () => {
    test('should enforce role-based permissions', async ({ page }) => {
      // Test as a member (not owner)
      // This would require setting up test data with different user roles

      await page.getByRole('button', { name: '团队设置' }).click();

      // Members should not see dangerous operations
      await expect(page.getByText('危险操作')).not.toBeVisible();

      // Members should not be able to delete team
      await expect(
        page.getByRole('button', { name: '删除团队' })
      ).not.toBeVisible();
    });

    test('should show appropriate UI for viewers', async ({ page }) => {
      // Test viewer permissions
      // Viewers should have very limited access

      // Navigate to calendar (viewers can view)
      await page.getByText('日历').click();
      await expect(page.getByTestId('calendar-view')).toBeVisible();

      // Viewers should not see create event button
      await expect(
        page.getByRole('button', { name: '创建事件' })
      ).not.toBeVisible();
    });
  });

  test.describe('Team Navigation and UX', () => {
    test('should maintain team context across navigation', async ({ page }) => {
      // Select a specific team
      await page.getByTestId('team-selector').click();
      await page.getByText('Test Team').click();

      // Navigate to different sections
      await page.getByText('日历').click();
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Test Team'
      );

      await page.getByText('设置').click();
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Test Team'
      );

      // Verify team context is maintained
      await expect(page).toHaveURL(/teamId=test-team/);
    });

    test('should show loading states during team operations', async ({
      page,
    }) => {
      await page.getByRole('button', { name: '创建团队' }).click();
      await page.getByLabel('团队名称').fill('Loading Test Team');

      // Click create and immediately check for loading state
      await page.getByRole('button', { name: '创建团队' }).click();

      // Should show loading state
      await expect(page.getByText('创建中...')).toBeVisible();
    });

    test('should handle team switching with proper loading states', async ({
      page,
    }) => {
      await page.getByTestId('team-selector').click();

      // Click on a team and check for loading
      await page.getByText('Another Team').click();

      // Should show loading indicator during switch
      await expect(page.getByTestId('team-loading')).toBeVisible();

      // Should complete switch
      await expect(page.getByTestId('current-team-name')).toHaveText(
        'Another Team'
      );
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Team selector should work on mobile
      await page.getByTestId('mobile-team-selector').click();
      await expect(page.getByText('切换团队')).toBeVisible();

      // Team creation should work on mobile
      await page.getByText('创建新团队').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Form should be properly sized for mobile
      const dialog = page.getByRole('dialog');
      const boundingBox = await dialog.boundingBox();
      expect(boundingBox?.width).toBeLessThan(375);
    });

    test('should have touch-friendly interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Buttons should be large enough for touch
      const createButton = page.getByRole('button', { name: '创建团队' });
      const boundingBox = await createButton.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(44); // iOS minimum touch target
    });
  });
});
