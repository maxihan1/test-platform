import { expect, test } from '@playwright/test';

test('할 일을 추가하고 완료 처리하면 남은 개수가 0이 된다', async ({ page }) => {
  await test.step('메인 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await expect(page.getByRole('heading', { name: 'todos' })).toBeVisible();
  });

  await test.step('할 일을 하나 추가한다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('증적 문서 검토');
    await input.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveCount(1);
  });

  await test.step('추가한 할 일을 완료 처리한다', async () => {
    await page.getByTestId('todo-item').first().getByRole('checkbox').check();
    await expect(page.getByTestId('todo-count')).toContainText('0');
  });
});
