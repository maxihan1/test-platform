import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-091',
  name: '앞뒤에 공백을 붙여 할 일을 더하면 목록에 공백을 뗀 「달걀 사기」가 보인다',
  precondition: ['할 일 목록이 비어 있다'],
  params: z.object({
    todo: z.string().min(1).describe('앞뒤에 공백을 붙여 더할 할 일 — 앞뒤 공백 없는 글자').default('달걀 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 연다', async () => {
    await 화면.열기();
    await verify('할 일 목록이 비어 있다', await 화면.목록줄.count(), 0, { blocker: true });
  });

  await test.step('입력칸에 「  달걀 사기  」를 적고 Enter 를 친다', async () => {
    await 화면.적고엔터('  ' + params.todo + '  ');
    await 화면.남은개수글('1 item left').waitFor();
    await verify('앞뒤에 공백을 붙여 할 일을 더하면 목록에 공백을 뗀 「달걀 사기」가 보인다', await 화면.할일이름.textContent(), params.todo);
  });
});
