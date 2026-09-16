import { expect, test } from '@playwright/test';

test('어느 환경에서든 할 일을 추가하면 목록에 한 건이 보인다', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('환경 두 개로 실행되는 케이스');
  await input.press('Enter');

  await expect(page.getByTestId('todo-title')).toHaveCount(1);
});
