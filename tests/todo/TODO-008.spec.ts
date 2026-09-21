import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'TODO-008',
  name: '완료분 지우기 버튼이 보인다',
  precondition: ['할 일이 한 건 있고 아직 안 끝냈다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    buttonVisible: z.boolean().describe('완료 표시를 누른 뒤 완료분 지우기 버튼이 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 아직 안 끝낸 할 일을 한 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await page.getByTestId('todo-item').first().waitFor();
    await verify('남은 개수가 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), '1 item left');
  });

  await test.step('그 할 일의 완료 표시를 누른다', async () => {
    await page.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await page.getByText('0 items left').waitFor();
    await verify('완료분 지우기 버튼이 보인다', await page.getByRole('button', { name: 'Clear completed' }).isVisible(), expected.buttonVisible);
  });
});
