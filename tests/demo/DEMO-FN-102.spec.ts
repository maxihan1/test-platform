import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-102',
  name: '보기 링크 「Completed」를 누르면 목록에 완료한 「우유 사기」만 보인다',
  precondition: ['할 일 목록에 완료한 「우유 사기」와 끝내지 않은 「빵 사기」가 있다'],
  params: z.object({
    done: z.string().min(1).describe('완료로 바꿀 할 일 — 앞뒤 공백 없는 글자').default('우유 사기'),
    active: z.string().min(1).describe('끝내지 않은 채 둘 할 일 — 앞뒤 공백 없는 글자, 완료로 바꿀 할 일과 다르게').default('빵 사기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 할일화면(page);

  await test.step('할 일 화면을 열고 「우유 사기」와 「빵 사기」를 더한 뒤 「우유 사기」를 완료로 바꾼다', async () => {
    await 화면.열기();
    await 화면.적고엔터(params.done);
    await 화면.적고엔터(params.active);
    await 화면.완료누르기(params.done);
  });

  await test.step('완료한 할 일 한 건과 끝내지 않은 할 일 한 건을 확인한다', async () => {
    await 화면.완료지우기.waitFor();
    await verify('남은 개수 칸에 「1 item left」가 보인다', await 화면.남은개수.innerText(), '1 item left', { blocker: true });
  });

  await test.step('보기 링크 「Completed」를 누른다', async () => {
    await 화면.보기고르기('Completed');
    await 화면.고른보기링크('Completed').waitFor();
    await verify('보기 링크 「Completed」를 누르면 목록에 완료한 「우유 사기」만 보인다', (await 화면.이름들()).join(', '), params.done);
  });
});
