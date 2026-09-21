import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-015',
  name: '다시 불러와도 목록에 「우유 사기」만 보인다',
  precondition: ['할 일이 한 건 있다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    left: z.string().describe('다시 불러온 뒤 목록에 남을 할 일을 쉼표로 이은 것').default('우유 사기'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 열고 할 일을 한 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-item').nth(0).waitFor();
    await verify('만들어 둔 할 일이 목록에 보인다', await page.getByTestId('todo-title').innerText(), params.todo, { blocker: true });
  });

  await test.step('화면을 다시 불러온다', async () => {
    await page.reload();
    await page.getByPlaceholder('What needs to be done?').waitFor();
    await verify('다시 불러와도 목록에 「우유 사기」만 보인다', (await page.getByTestId('todo-title').allInnerTexts()).join(', '), expected.left);
  });
});
