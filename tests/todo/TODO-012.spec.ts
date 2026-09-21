import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-012',
  name: '목록에 할 일이 한 건도 보이지 않는다',
  precondition: ['할 일이 한 건 있다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    left: z.number().describe('이름을 지우고 확정한 뒤 목록에 남을 할 일 건수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 할 일을 한 건 만든 뒤 두 번 눌러 고칠 수 있게 한다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-item').first().waitFor();
    await page.getByTestId('todo-title').dblclick();
    await page.getByTestId('todo-title').waitFor({ state: 'hidden' });
    await verify('이름을 고치는 입력칸이 보인다', await page.getByRole('textbox', { name: 'Edit' }).isVisible(), true);
  });

  await test.step('이름을 모두 지우고 Enter 를 친다', async () => {
    const edit = page.getByRole('textbox', { name: 'Edit' });
    await edit.fill('');
    await edit.press('Enter');
    await page.getByTestId('todo-count').waitFor({ state: 'detached' });
    await verify('목록에 할 일이 한 건도 보이지 않는다', await page.getByTestId('todo-item').count(), expected.left);
  });
});
