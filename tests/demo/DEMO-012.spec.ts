import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-012',
  name: '「Clear completed」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['아직 끝내지 않은 할 일이 두 건 있다'],
  params: z.object({
    first: z.string().min(1).describe('미리 넣어 둘 첫째 할 일').default('우유 사기'),
    second: z.string().min(1).describe('미리 넣어 둘 둘째 할 일').default('빵 사기'),
  }),
  expected: z.object({
    clearVisible: z.boolean().describe('첫째를 완료한 뒤 「Clear completed」 버튼이 보이는지').default(true),
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
  });

  await test.step('안 끝낸 할 일이 두 건인지 확인한다', async () => {
    await page.getByTestId('todo-item').nth(1).waitFor();
    await verify('아직 안 끝낸 것이 두 건이라 「2 items left」로 보인다', await page.getByTestId('todo-count').innerText(), '2 items left', { blocker: true });
  });

  await test.step('첫째 할 일의 완료 표시를 누른다', async () => {
    await page.getByTestId('todo-item').filter({ hasText: params.first }).getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await page.getByText('1 item left').waitFor();
    await verify('「Clear completed」 버튼이 보인다', await page.getByRole('button', { name: 'Clear completed' }).isVisible(), expected.clearVisible);
  });
});
