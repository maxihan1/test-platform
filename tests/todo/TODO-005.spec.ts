import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-005',
  name: '목록에 할 일이 두 건 보인다',
  precondition: ['끝낸 할 일과 안 끝낸 할 일이 한 건씩 있다'],
  params: z.object({
    active: z.string().min(1).describe('안 끝낸 채로 둘 할 일').default('우유 사기'),
    done: z.string().min(1).describe('끝낸 것으로 표시할 할 일').default('빵 사기'),
  }),
  expected: z.object({
    shown: z.number().describe('All 을 골랐을 때 목록에 보일 할 일 건수').default(2),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 끝낸 할 일과 안 끝낸 할 일을 한 건씩 만든 뒤 보기를 「Active」로 좁혀 둔다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.active);
    await input.press('Enter');
    await input.fill(params.done);
    await input.press('Enter');
    await page.getByTestId('todo-item').nth(1).waitFor();
    await page.getByRole('checkbox', { name: 'Toggle Todo' }).nth(1).check();
    await page.getByRole('button', { name: 'Clear completed' }).waitFor();
    await page.getByRole('link', { name: 'Active' }).click();
    await page.getByTestId('todo-item').nth(1).waitFor({ state: 'detached' });
    await verify('좁혀 둔 목록에 안 끝낸 할 일만 남는다', (await page.getByTestId('todo-title').allInnerTexts()).join(', '), params.active, { blocker: true });
  });

  await test.step('보기에서 「All」을 고른다', async () => {
    await page.getByRole('link', { name: 'All' }).click();
    await page.getByTestId('todo-title').filter({ hasText: params.done }).waitFor();
    await verify('목록에 할 일이 두 건 보인다', await page.getByTestId('todo-item').count(), expected.shown);
  });
});
