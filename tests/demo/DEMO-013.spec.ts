import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-013',
  name: '「Clear completed」를 누르면 완료한 할 일만 사라지고 아직 끝내지 않은 할 일은 남는다',
  platforms: ['desktop'],
  precondition: ['완료한 할 일 한 건과 아직 끝내지 않은 할 일 한 건이 있다'],
  params: z.object({
    done: z.string().min(1).describe('완료 표시를 눌러 둘 할 일').default('우유 사기'),
    active: z.string().min(1).describe('끝내지 않은 채로 둘 할 일').default('빵 사기'),
  }),
  expected: z.object({
    doneVisible: z.boolean().describe('지운 뒤 완료한 할 일이 보이는지').default(false),
    activeVisible: z.boolean().describe('지운 뒤 끝내지 않은 할 일이 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('화면을 열고 할 일 두 건을 만든 뒤 한 건의 완료 표시를 누른다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.done);
    await input.press('Enter');
    await input.fill(params.active);
    await input.press('Enter');
    await page.getByTestId('todo-item').filter({ hasText: params.done }).getByRole('checkbox', { name: 'Toggle Todo' }).check();
  });

  await test.step('완료한 것 한 건과 안 끝낸 것 한 건이 있는지 확인한다', async () => {
    await page.getByRole('button', { name: 'Clear completed' }).waitFor();
    await verify('안 끝낸 할 일이 한 건이라 「1 item left」로 보인다', await page.getByTestId('todo-count').innerText(), '1 item left', { blocker: true });
  });

  await test.step('「Clear completed」 버튼을 누른다', async () => {
    const clear = page.getByRole('button', { name: 'Clear completed' });
    await clear.click();
    await clear.waitFor({ state: 'hidden' });
    await verify('완료한 할 일이 목록에서 보이지 않는다', await page.getByTestId('todo-title').filter({ hasText: params.done }).isVisible(), expected.doneVisible);
    await verify('아직 끝내지 않은 할 일은 목록에 남아 보인다', await page.getByTestId('todo-title').filter({ hasText: params.active }).isVisible(), expected.activeVisible);
  });
});
