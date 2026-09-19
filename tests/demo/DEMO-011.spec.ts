import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DEMO-011',
  name: '비밀값 꼬리표를 단 입력값이 있는 케이스가 할 일을 추가하면 목록에 한 건이 보인다',
  platforms: ['desktop'],
  precondition: [
    '할 일 목록 데모 사이트에 접근할 수 있다',
    '할 일 목록이 비어 있다',
    'password는 비밀값 꼬리표를 보이려고 둔 칸이고 실행 중에 일부러 쓰지 않는다. 이 대상 사이트에는 비밀번호 입력칸이 없고 입력칸에 친 글자는 할 일 항목으로 화면에 그대로 남아 증적 스크린샷에 평문으로 찍히기 때문이다',
    'password가 하는 일은 셋이다. check:tests의 K9를 만족시키고, run_item.params에 평문으로 저장되어 같은 실행을 다시 돌릴 수 있게 하고, 화면 입력칸과 항목 상세와 증적 문서에서만 별표로 가려져 나온다',
  ],
  params: z.object({
    password: z.string().min(1).describe('비밀번호').default('demo-secret-1234').meta({ secret: true }),
    todo: z.string().min(1).describe('추가할 할 일').default('비밀값 꼬리표 데모'),
  }),
  expected: z.object({
    todoCount: z.number().describe('추가한 뒤 목록에 보일 할 일 개수').default(1),
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
