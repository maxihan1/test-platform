import { expect, test } from '@playwright/test';

test.setTimeout(90_000);

test('응답이 오지 않는 동안 기다리다 실행 제한 시간을 넘긴다', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();

  await page.waitForTimeout(60_000);
});
