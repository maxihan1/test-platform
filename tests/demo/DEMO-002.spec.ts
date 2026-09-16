import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-002',
  name: '할 일을 하나 추가하면 목록이 두 건이 된다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('추가할 할 일').default('첫 번째 할 일'),
  }),
  expected: z.object({
    todoCount: z.number().describe('추가한 뒤 목록에 보일 할 일 개수').default(2),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });

  await test.step('할 일을 하나 추가한다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await verify('목록에 보이는 할 일 개수가 기대와 같다', await page.getByTestId('todo-title').count(), expected.todoCount);
  });
});
