import { expect, test } from '@playwright/test';

test('할 일을 하나 추가하면 목록이 두 건이 된다', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');

  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('첫 번째 할 일');
  await input.press('Enter');

  await expect(page.getByTestId('todo-title')).toHaveCount(2);
});
