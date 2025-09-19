/**
 * E2E tests for authentication flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.describe('User Registration', () => {
    test('should complete user registration successfully', async ({ page }) => {
      await page.goto('/auth/register');

      // Verify registration page loads
      await expect(
        page.getByRole('heading', { name: '注册账户' })
      ).toBeVisible();

      // Fill registration form
      await page.getByLabel('姓名').fill('Test User');
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码', { exact: true }).fill('SecurePassword123!');
      await page.getByLabel('确认密码').fill('SecurePassword123!');

      // Submit registration
      await page.getByRole('button', { name: '注册' }).click();

      // Wait for success message or redirect
      await expect(page.getByText('注册成功')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid input', async ({
      page,
    }) => {
      await page.goto('/auth/register');

      // Try to submit with invalid email
      await page.getByLabel('姓名').fill('Test User');
      await page.getByLabel('邮箱').fill('invalid-email');
      await page.getByLabel('密码', { exact: true }).fill('123');
      await page.getByLabel('确认密码').fill('456');

      await page.getByRole('button', { name: '注册' }).click();

      // Verify validation errors
      await expect(page.getByText('邮箱格式不正确')).toBeVisible();
      await expect(page.getByText('密码长度至少8位')).toBeVisible();
      await expect(page.getByText('密码不匹配')).toBeVisible();
    });

    test('should navigate to login page from registration', async ({
      page,
    }) => {
      await page.goto('/auth/register');

      // Click login link
      await page.getByText('已有账户？立即登录').click();

      // Verify navigation to login page
      await expect(page).toHaveURL('/auth/login');
      await expect(
        page.getByRole('heading', { name: '登录账户' })
      ).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login successfully with valid credentials', async ({
      page,
    }) => {
      await page.goto('/auth/login');

      // Verify login page loads
      await expect(
        page.getByRole('heading', { name: '登录账户' })
      ).toBeVisible();

      // Fill login form
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');

      // Submit login
      await page.getByRole('button', { name: '登录' }).click();

      // Wait for redirect to dashboard
      await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
      await expect(page.getByText('欢迎回来')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      // Fill login form with wrong credentials
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('WrongPassword');

      await page.getByRole('button', { name: '登录' }).click();

      // Verify error message
      await expect(page.getByText('邮箱或密码错误')).toBeVisible();
      await expect(page).toHaveURL('/auth/login');
    });

    test('should navigate to registration page from login', async ({
      page,
    }) => {
      await page.goto('/auth/login');

      // Click register link
      await page.getByText('没有账户？立即注册').click();

      // Verify navigation to registration page
      await expect(page).toHaveURL('/auth/register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/auth/login');

      // Click forgot password link
      await page.getByText('忘记密码？').click();

      // Verify navigation to forgot password page
      await expect(page).toHaveURL('/auth/forgot-password');
      await expect(
        page.getByRole('heading', { name: '重置密码' })
      ).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset successfully', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      // Verify forgot password page loads
      await expect(
        page.getByRole('heading', { name: '重置密码' })
      ).toBeVisible();

      // Fill email field
      await page.getByLabel('邮箱').fill('test@example.com');

      // Submit reset request
      await page.getByRole('button', { name: '发送重置邮件' }).click();

      // Verify success message
      await expect(page.getByText('密码重置邮件已发送')).toBeVisible();
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      // Fill invalid email
      await page.getByLabel('邮箱').fill('invalid-email');

      await page.getByRole('button', { name: '发送重置邮件' }).click();

      // Verify error message
      await expect(page.getByText('邮箱格式不正确')).toBeVisible();
    });

    test('should navigate back to login page', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      // Click back to login link
      await page.getByText('返回登录').click();

      // Verify navigation to login page
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Authentication State', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected dashboard page
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should redirect authenticated users from auth pages', async ({
      page,
    }) => {
      // First login
      await page.goto('/auth/login');
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');
      await page.getByRole('button', { name: '登录' }).click();

      // Wait for successful login
      await expect(page).toHaveURL('/dashboard');

      // Try to access login page while authenticated
      await page.goto('/auth/login');

      // Should redirect back to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');
      await page.getByRole('button', { name: '登录' }).click();

      await expect(page).toHaveURL('/dashboard');

      // Refresh the page
      await page.reload();

      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('欢迎回来')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');
      await page.getByRole('button', { name: '登录' }).click();

      await expect(page).toHaveURL('/dashboard');

      // Click logout button
      await page.getByRole('button', { name: '退出登录' }).click();

      // Should redirect to home page
      await expect(page).toHaveURL('/');

      // Try to access dashboard again
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Form Validation and UX', () => {
    test('should show loading states during authentication', async ({
      page,
    }) => {
      await page.goto('/auth/login');

      // Fill form
      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');

      // Click login and immediately check for loading state
      await page.getByRole('button', { name: '登录' }).click();

      // Should show loading state
      await expect(page.getByText('登录中...')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept and fail the login request
      await page.route('/api/auth/signin', route => {
        route.abort('failed');
      });

      await page.goto('/auth/login');

      await page.getByLabel('邮箱').fill('test@example.com');
      await page.getByLabel('密码').fill('SecurePassword123!');
      await page.getByRole('button', { name: '登录' }).click();

      // Should show network error message
      await expect(page.getByText('网络错误，请稍后重试')).toBeVisible();
    });

    test('should validate form fields in real-time', async ({ page }) => {
      await page.goto('/auth/register');

      // Type invalid email and move to next field
      await page.getByLabel('邮箱').fill('invalid');
      await page.getByLabel('密码', { exact: true }).focus();

      // Should show email validation error
      await expect(page.getByText('邮箱格式不正确')).toBeVisible();

      // Type short password
      await page.getByLabel('密码', { exact: true }).fill('123');
      await page.getByLabel('确认密码').focus();

      // Should show password validation error
      await expect(page.getByText('密码长度至少8位')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('邮箱')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel('密码')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: '登录' })).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/auth/login');

      // Check form has proper role
      await expect(page.getByRole('form')).toBeVisible();

      // Check inputs have proper labels
      await expect(page.getByLabel('邮箱')).toHaveAttribute('type', 'email');
      await expect(page.getByLabel('密码')).toHaveAttribute('type', 'password');

      // Check button has proper role
      await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
    });
  });
});
