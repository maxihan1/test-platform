import { expect, test } from '@playwright/test';

test('화면 가로 폭이 데스크톱 기준인 700px 이상이다', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();

  const width = page.viewportSize()?.width ?? 0;

  expect(width).toBeGreaterThanOrEqual(700);
});
