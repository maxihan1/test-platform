import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-006',
  name: '할 일을 추가하고 완료 처리하면 남은 개수가 0이 된다',
  precondition: ['할 일 목록 데모 사이트에 접근할 수 있다', '할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('추가할 할 일').default('증적 문서 검토'),
  }),
  expected: z.object({
    remaining: z.string().describe('완료 처리한 뒤 남은 할 일 개수 표시').default('0'),
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
    await verify('추가한 할 일이 목록에 보인다', await page.getByTestId('todo-title').innerText(), params.todo);
  });

  await test.step('추가한 할 일을 완료 처리한다', async () => {
    await page.getByTestId('todo-item').first().getByRole('checkbox').check();
    const count = await page.getByTestId('todo-count').innerText();
    await verify('남은 할 일 개수가 기대와 같다', count.replace(/[^0-9]/g, ''), expected.remaining);
  }, { capture: true });
});
