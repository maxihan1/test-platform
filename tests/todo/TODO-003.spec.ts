import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-003',
  name: '남은 개수 영역이 보이지 않는다',
  precondition: ['할 일 목록이 비어 있다'],
  params: null,
  expected: z.object({
    countVisible: z.boolean().describe('빈 목록에서 남은 개수 영역이 화면에 보이는지').default(false),
  }),
});

test(spec, async ({ page, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true, { blocker: true });
  });

  await test.step('아무것도 하지 않는다', async () => {
    await verify('남은 개수 영역이 보이지 않는다', await page.getByTestId('todo-count').isVisible(), expected.countVisible);
  });
});
