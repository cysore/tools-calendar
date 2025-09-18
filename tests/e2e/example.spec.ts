import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');

  // Check if the main heading is visible
  await expect(
    page.getByRole('heading', { name: '团队日历同步器' })
  ).toBeVisible();

  // Check if the description is present
  await expect(page.getByText('轻量级团队日历管理 PWA 应用')).toBeVisible();

  // Check if the main buttons are present
  await expect(page.getByRole('button', { name: '开始使用' })).toBeVisible();
  await expect(page.getByRole('button', { name: '了解更多' })).toBeVisible();
});

test('page has correct meta information', async ({ page }) => {
  await page.goto('/');

  // Check page title
  await expect(page).toHaveTitle(/团队日历同步器/);

  // Check meta description
  const metaDescription = page.locator('meta[name="description"]');
  await expect(metaDescription).toHaveAttribute(
    'content',
    /轻量级团队日历管理 PWA 应用/
  );
});
