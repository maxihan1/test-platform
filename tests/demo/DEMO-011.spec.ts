import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-011',
  name: '비밀값 꼬리표를 단 입력값이 있는 케이스가 할 일을 추가하면 목록에 한 건이 보인다',
  platforms: ['desktop'],
  precondition: [
    '할 일 목록 데모 사이트에 접근할 수 있다',
    '할 일 목록이 비어 있다',
    '비밀번호 칸은 가려서 보이는지 보려고 둔 것이고 이 시험에서는 쓰지 않는다',
  ],
  params: z.object({
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
    todo: z.string().min(1).describe('추가할 할 일').default('비밀값 꼬리표 데모'),
  }),
  expected: z.object({
    todoCount: z.number().describe('기대 할 일 개수').default(1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('할 일 목록 화면을 연다', async () => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await verify('화면 제목 todos가 보인다', await page.getByRole('heading', { name: 'todos' }).isVisible(), true);
  });

  await test.step('비밀값이 아닌 입력값만 화면에 친다', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill(params.todo);
    await input.press('Enter');
    await verify('목록에 보이는 할 일 개수가 기대와 같다', await page.getByTestId('todo-title').count(), expected.todoCount);
  });
});
