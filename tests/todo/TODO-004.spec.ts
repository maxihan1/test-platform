import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-004',
  name: '남은 개수가 0 으로 보인다',
  precondition: ['할 일이 한 건 있다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    remaining: z.string().describe('완료 표시를 누른 뒤 보일 남은 개수 문구').default('0 items left'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 열고 할 일을 한 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await verify('만들어 둔 할 일이 목록에 보인다', await page.getByTestId('todo-title').innerText(), params.todo);
  });

  await test.step('그 할 일의 완료 표시를 누른다', async () => {
    await page.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await verify('남은 개수가 0 으로 보인다', await page.getByTestId('todo-count').innerText(), expected.remaining);
  });
});
