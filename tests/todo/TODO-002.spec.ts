import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-002',
  name: '남은 개수가 「1 item left」로 보인다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('추가할 할 일').default('우유 사기'),
  }),
  expected: z.object({
    remaining: z.string().describe('목록 아래에 보일 남은 개수 문구').default('1 item left'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true, { blocker: true });
  });

  await test.step('할 일을 한 건 추가한다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-count').waitFor();
    await verify('남은 개수가 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), expected.remaining);
  });
});
