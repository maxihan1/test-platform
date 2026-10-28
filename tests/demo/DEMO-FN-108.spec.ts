import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-108',
  name: '고치기 칸을 비우고 Enter 를 치면 목록에서 「빵 사기」가 보이지 않는다',
  precondition: ['할 일 목록에 「우유 사기」와 「빵 사기」가 있다'],
  params: z.object({
    first: z.string().min(1).describe('남겨 둘 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    target: z.string().min(1).describe('지울 할 일 — 앞뒤 공백 없는 글자, 남겨 둘 할 일과 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「우유 사기」와 「빵 사기」를 더한다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.first);
    await 화면.적고엔터(params.target);
  });

  await test.step('할 일 두 건을 확인한다', async () => {
    await 화면.줄(params.target).waitFor();
    await verify('남은 개수 칸에 「2 items left」가 보인다', await 화면.남은개수.innerText(), '2 items left', { blocker: true });
  });

  await test.step('「빵 사기」를 두 번 누르고 고치기 칸을 비운 뒤 Enter 를 친다', async () => {
    await 화면.고치기열기(params.target);
    await 화면.고치기칸에적기('');
    await 화면.고치기칸키('Enter');
    await 화면.남은개수글('1 item left').waitFor();
    await verify('고치기 칸을 비우고 Enter 를 치면 목록에서 「빵 사기」가 보이지 않는다', await 화면.줄(params.target).isVisible(), false);
  });
});
