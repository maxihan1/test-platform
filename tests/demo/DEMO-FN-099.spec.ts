import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-099',
  name: '「Mark all as complete」를 누르면 목록의 할 일 두 건이 모두 완료한 할 일로 보인다',
  precondition: ['할 일 목록에 끝내지 않은 「빵 사기」와 「우유 사기」가 있다'],
  params: z.object({
    done: z.string().min(1).describe('완료로 바꿀 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    active: z.string().min(1).describe('끝내지 않은 채 둘 할 일 — 앞뒤 공백 없는 글자, 완료로 바꿀 할 일과 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「우유 사기」와 「빵 사기」를 더한다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.done);
    await 화면.적고엔터(params.active);
  });

  await test.step('끝내지 않은 할 일 두 건을 확인한다', async () => {
    await 화면.줄(params.active).waitFor();
    await verify('남은 개수 칸에 「2 items left」가 보인다', await 화면.남은개수.innerText(), '2 items left', { blocker: true });
  });

  await test.step('「Mark all as complete」를 누른다', async () => {
    await 화면.모두완료누르기();
    await 화면.완료지우기.waitFor();
    await verify('「Mark all as complete」를 누르면 목록의 할 일 두 건이 모두 완료한 할 일로 보인다', await 화면.완료한줄.count(), 2);
  });
});
