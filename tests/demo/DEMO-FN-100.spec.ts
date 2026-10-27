import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-100',
  name: '모든 할 일이 완료된 채 「Mark all as complete」를 누르면 목록의 할 일 두 건이 모두 끝내지 않은 할 일로 보인다',
  precondition: ['할 일 목록에 완료한 「우유 사기」와 「빵 사기」가 있다'],
  params: z.object({
    first: z.string().min(1).describe('첫째 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    second: z.string().min(1).describe('둘째 할 일 — 앞뒤 공백 없는 글자, 첫째와 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「우유 사기」와 「빵 사기」를 더한 뒤 둘 다 완료로 바꾼다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.first);
    await 화면.적고엔터(params.second);
    await 화면.완료누르기(params.first);
    await 화면.완료누르기(params.second);
  });

  await test.step('모든 할 일이 완료된 것을 확인한다', async () => {
    await 화면.완료지우기.waitFor();
    await verify('남은 개수 칸에 「0 items left」가 보인다', await 화면.남은개수.innerText(), '0 items left', { blocker: true });
  });

  await test.step('「Mark all as complete」를 누른다', async () => {
    await 화면.모두완료누르기();
    await 화면.완료지우기.waitFor({ state: 'hidden' });
    await verify('모든 할 일이 완료된 채 「Mark all as complete」를 누르면 목록의 할 일 두 건이 모두 끝내지 않은 할 일로 보인다', await 화면.완료한줄.count(), 0);
  });
});
