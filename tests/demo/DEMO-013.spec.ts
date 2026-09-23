import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-013',
  name: '「Clear completed」 를 누르면 완료한 할 일만 사라지고 완료하지 않은 할 일은 남으며 버튼도 사라진다',
  platforms: ['desktop'],
  precondition: ['할 일이 두 건 있고 그중 첫째만 완료했다'],
  params: z.object({
    first: z.string().min(1).describe('미리 넣어 두고 완료할 첫째 할 일').default('우유 사기'),
    second: z.string().min(1).describe('미리 넣어 두고 안 끝낼 둘째 할 일').default('빵 사기'),
  }),
  expected: z.object({
    completedShown: z.boolean().describe('지운 뒤 완료한 할 일이 목록에 보이는지').default(false),
    activeShown: z.boolean().describe('지운 뒤 완료하지 않은 할 일이 목록에 보이는지').default(true),
    clearVisible: z.boolean().describe('지운 뒤 「Clear completed」 버튼이 보이는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 열고 할 일을 두 건 만든 뒤 첫째만 완료 표시를 누른다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.first);
    await input.press('Enter');
    await input.fill(params.second);
    await input.press('Enter');
    await page.getByTestId('todo-item').filter({ hasText: params.first }).getByRole('checkbox', { name: 'Toggle Todo' }).check();
  });

  await test.step('첫째만 완료했는지 확인한다', async () => {
    await page.getByRole('button', { name: 'Clear completed' }).waitFor();
    await verify('첫째만 완료해서 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), '1 item left', { blocker: true });
  });

  await test.step('「Clear completed」 를 누른다', async () => {
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await page.getByTestId('todo-item').nth(1).waitFor({ state: 'detached' });
    const titles = await page.getByTestId('todo-title').allInnerTexts();
    await verify('완료한 할 일이 목록에서 사라진다', titles.includes(params.first), expected.completedShown);
    await verify('완료하지 않은 할 일은 목록에 남는다', titles.includes(params.second), expected.activeShown);
    await verify('완료한 할 일이 모두 사라져 「Clear completed」 버튼이 보이지 않는다', await page.getByRole('button', { name: 'Clear completed' }).isVisible(), expected.clearVisible);
  });
});
