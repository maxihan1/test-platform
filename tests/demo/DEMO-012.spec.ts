import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-012',
  name: '목록 아래에 「Clear completed」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['아직 끝내지 않은 할 일이 한 건 있다'],
  params: z.object({
    todo: z.string().min(1).describe('미리 넣어 둘 할 일').default('우유 사기'),
  }),
  expected: z.object({
    buttonBelow: z.boolean().describe('완료 표시를 누른 뒤 목록 아래에 버튼이 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 아직 안 끝낸 할 일을 한 건 만든다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
  });

  await test.step('안 끝낸 할 일이 한 건인지 확인한다', async () => {
    await page.getByTestId('todo-item').first().waitFor();
    await verify('남은 개수가 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), '1 item left', { blocker: true });
  });

  await test.step('그 할 일의 완료 표시를 누른다', async () => {
    await page.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await page.getByText('0 items left').waitFor();
    const item = await page.getByTestId('todo-item').boundingBox();
    const button = await page.getByRole('button', { name: 'Clear completed' }).boundingBox();
    const below = item !== null && button !== null && button.y >= item.y + item.height;
    await verify('목록 아래에 「Clear completed」 버튼이 보인다', below, expected.buttonBelow);
  });
});
