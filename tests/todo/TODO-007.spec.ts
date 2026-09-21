import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-007',
  name: '목록에 「빵 사기」만 보인다',
  precondition: ['끝낸 할 일과 안 끝낸 할 일이 한 건씩 있다'],
  params: z.object({
    active: z.string().min(1).describe('안 끝낸 채로 둘 할 일').default('우유 사기'),
    done: z.string().min(1).describe('끝낸 것으로 표시할 할 일').default('빵 사기'),
  }),
  expected: z.object({
    shown: z.string().describe('Completed 를 골랐을 때 목록에 보일 할 일을 쉼표로 이은 것').default('빵 사기'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 끝낸 할 일과 안 끝낸 할 일을 한 건씩 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.active);
    await input.press('Enter');
    await input.fill(params.done);
    await input.press('Enter');
    await page.getByTestId('todo-item').nth(1).waitFor();
    await page.getByRole('checkbox', { name: 'Toggle Todo' }).nth(1).check();
    await page.getByRole('button', { name: 'Clear completed' }).waitFor();
    await verify('남은 개수가 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), '1 item left');
  });

  await test.step('보기에서 「Completed」를 고른다', async () => {
    await page.getByRole('link', { name: 'Completed' }).click();
    await page.getByTestId('todo-item').nth(1).waitFor({ state: 'detached' });
    await verify('목록에 「빵 사기」만 보인다', (await page.getByTestId('todo-title').allInnerTexts()).join(', '), expected.shown);
  });
});
