import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-001',
  name: '목록에 「우유 사기」가 보인다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('추가할 할 일').default('우유 사기'),
  }),
  expected: z.object({
    title: z.string().describe('목록에 보일 할 일 글자').default('우유 사기'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true, { blocker: true });
  });

  await test.step('입력칸에 「우유 사기」를 적고 Enter 를 친다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-item').first().waitFor();
    await verify('목록에 「우유 사기」가 보인다', await page.getByTestId('todo-title').innerText(), expected.title);
  });
});
