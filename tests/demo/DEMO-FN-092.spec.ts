import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-092',
  name: '끝내지 않은 할 일이 두 건이면 남은 개수 칸에 「2 items left」가 보인다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    first: z.string().min(1).describe('첫째 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    second: z.string().min(1).describe('둘째 할 일 — 앞뒤 공백 없는 글자, 첫째와 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 연다', async () => {
    await 화면.열기();
    await verify('할 일 목록이 비어 있다', await 화면.목록줄.count(), 0, { blocker: true });
  });

  await test.step('입력칸에 「우유 사기」와 「빵 사기」를 차례로 적어 더한다', async () => {
    await 화면.적고엔터(params.first);
    await 화면.적고엔터(params.second);
    await 화면.줄(params.second).waitFor();
    await verify('끝내지 않은 할 일이 두 건이면 남은 개수 칸에 「2 items left」가 보인다', await 화면.남은개수.innerText(), '2 items left');
  });
});
