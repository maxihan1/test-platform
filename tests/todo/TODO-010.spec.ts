import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-010',
  name: '이름을 고치는 입력칸이 보인다',
  precondition: ['할 일이 한 건 있다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    editVisible: z.boolean().describe('두 번 누른 뒤 이름을 고치는 입력칸이 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 할 일을 한 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-item').first().waitFor();
    await verify('만들어 둔 할 일이 목록에 보인다', await page.getByTestId('todo-title').innerText(), params.todo, { blocker: true });
  });

  await test.step('그 할 일을 두 번 누른다', async () => {
    await page.getByTestId('todo-title').dblclick();
    await page.getByTestId('todo-title').waitFor({ state: 'hidden' });
    await verify('이름을 고치는 입력칸이 보인다', await page.getByRole('textbox', { name: 'Edit' }).isVisible(), expected.editVisible);
  });
});
