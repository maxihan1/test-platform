import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-107',
  name: '고치기 칸 밖을 누르면 목록에 공백을 뗀 「통밀빵 사기」가 보인다',
  precondition: ['할 일 목록에 「빵 사기」가 있다'],
  params: z.object({
    first: z.string().min(1).describe('먼저 넣어 둘 할 일 — 앞뒤 공백 없는 글자').default('빵 사기'),
    renamed: z.string().min(1).describe('앞뒤에 공백을 붙여 고쳐 넣을 이름 — 앞뒤 공백 없는 글자, 먼저 넣어 둘 할 일과 다르게').default('통밀빵 사기'),
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
    await verify('남은 개수 칸에 「1 item left」가 보인다', await 화면.남은개수.innerText(), '1 item left', { blocker: true });
  });

  await test.step('「빵 사기」를 두 번 누르고 고치기 칸에 「  통밀빵 사기  」를 적은 뒤 제목 「todos」를 누른다', async () => {
    await 화면.고치기열기(params.first);
    await 화면.고치기칸에적기('  ' + params.renamed + '  ');
    await 화면.제목누르기();
    await 화면.고치기칸.waitFor({ state: 'hidden' });
    await verify('고치기 칸 밖을 누르면 목록에 공백을 뗀 「통밀빵 사기」가 보인다', await 화면.할일이름.textContent(), params.renamed);
  });
});
