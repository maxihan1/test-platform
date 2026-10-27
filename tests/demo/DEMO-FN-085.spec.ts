import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-085',
  name: '할 일 목록이 비어 있을 때 할 일 화면을 열면 남은 개수와 보기 링크가 보이지 않는다',
  precondition: ['할 일 목록이 비어 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    todo: z.string().min(1).describe('더할 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 연다', async () => {
    await 화면.열기();
    const 개수 = await verify('남은 개수 칸이 보이지 않는다', await 화면.남은개수.isVisible(), false);
    const 링크 = await verify('보기 링크 「All」이 보이지 않는다', await 화면.보기링크('All').isVisible(), false);
    await verify('할 일 목록이 비어 있을 때 할 일 화면을 열면 남은 개수와 보기 링크가 보이지 않는다', 개수 && 링크, true);
  });

  await test.step('입력칸에 「우유 사기」를 적고 Enter 를 친다', async () => {
    await 화면.적고엔터(params.todo);
    await 화면.줄(params.todo).waitFor();
    const 개수 = await verify('남은 개수 칸이 보인다', await 화면.남은개수.isVisible(), true);
    const 링크 = await verify('보기 링크 「All」이 보인다', await 화면.보기링크('All').isVisible(), true);
    await verify('할 일이 한 건 생기면 남은 개수와 보기 링크가 보인다', 개수 && 링크, true);
  });
});
