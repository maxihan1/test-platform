import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-088',
  name: '입력칸에 할 일을 적고 Enter 를 치면 입력칸이 비워진다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('더할 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 연다', async () => {
    await 화면.열기();
    await verify('할 일 목록이 비어 있다', await 화면.목록줄.count(), 0, { blocker: true });
  });

  await test.step('입력칸에 「우유 사기」를 적고 Enter 를 친다', async () => {
    await 화면.적고엔터(params.todo);
    await 화면.줄(params.todo).waitFor();
    await verify('입력칸에 할 일을 적고 Enter 를 치면 입력칸이 비워진다', await 화면.입력칸.inputValue(), '');
  });
});
