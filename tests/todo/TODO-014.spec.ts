import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-014',
  name: '남은 개수가 「0 items left」로 보인다',
  precondition: ['아직 끝내지 않은 할 일이 두 건 있다'],
  params: z.object({
    first: z.string().min(1).describe('미리 넣어 둘 첫째 할 일').default('우유 사기'),
    second: z.string().min(1).describe('미리 넣어 둘 둘째 할 일').default('빵 사기'),
  }),
  expected: z.object({
    remaining: z.string().describe('화살표를 누른 뒤 보일 남은 개수 문구').default('0 items left'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 열고 안 끝낸 할 일을 두 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.first);
    await input.press('Enter');
    await input.fill(params.second);
    await input.press('Enter');
    await page.getByTestId('todo-item').nth(1).waitFor();
    await verify('아직 안 끝낸 것이 두 건이라 「2 items left」로 보인다', await page.getByTestId('todo-count').innerText(), '2 items left');
  });

  await test.step('목록 위쪽의 화살표 표시를 누른다', async () => {
    await page.getByRole('checkbox', { name: 'Mark all as complete' }).check();
    await page.getByRole('button', { name: 'Clear completed' }).waitFor();
    await verify('남은 개수가 「0 items left」로 보인다', await page.getByTestId('todo-count').innerText(), expected.remaining);
  });
});
