import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-014',
  name: '「Clear completed」 버튼이 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('추가할 할 일').default('우유 사기'),
  }),
  expected: z.object({
    clearVisible: z.boolean().describe('완료한 것 없이 할 일만 있을 때 「Clear completed」 버튼이 보이는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
  });

  await test.step('목록이 비어 있는지 확인한다', async () => {
    await page.getByPlaceholder('What needs to be done?').waitFor();
    await verify('처음 연 목록에 할 일이 한 건도 없다', await page.getByTestId('todo-item').count(), 0, { blocker: true });
  });

  await test.step('할 일을 한 건 추가한다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByText('1 item left').waitFor();
    await verify('「Clear completed」 버튼이 보이지 않는다', await page.getByRole('button', { name: 'Clear completed' }).isVisible(), expected.clearVisible);
  });
});
