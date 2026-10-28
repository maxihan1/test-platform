import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-086',
  name: '입력칸에 「우유 사기」를 적고 Enter 를 치면 목록 맨 아래에 「우유 사기」가 보인다',
  precondition: ['할 일 목록에 「빵 사기」가 있다'],
  smoke: true,
  params: z.object({
    first: z.string().min(1).describe('먼저 넣어 둘 할 일 — 앞뒤 공백 없는 글자').default('빵 사기'),
    todo: z.string().min(1).describe('더할 할 일 — 앞뒤 공백 없는 글자, 먼저 넣어 둘 할 일과 다르게').default('우유 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「빵 사기」를 더한다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.first);
  });

  await test.step('할 일이 한 건인 것을 확인한다', async () => {
    await 화면.줄(params.first).waitFor();
    await verify('목록에 할 일이 「빵 사기」 한 건 보인다', (await 화면.이름들()).join(', '), params.first, { blocker: true });
  });

  await test.step('입력칸에 「우유 사기」를 적고 Enter 를 친다', async () => {
    await 화면.적고엔터(params.todo);
    await 화면.남은개수글('2 items left').waitFor();
    await verify('입력칸에 「우유 사기」를 적고 Enter 를 치면 목록 맨 아래에 「우유 사기」가 보인다', (await 화면.이름들()).at(-1), params.todo);
  });
});
