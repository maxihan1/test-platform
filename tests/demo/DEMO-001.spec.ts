import { expect, test } from '@playwright/test';

test('메인 화면이 열린다', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();
});
