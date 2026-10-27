import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 할일화면 } from './pages/todo.page.js';

export const spec = defineCase({
  tcId: 'DEMO-FN-104',
  name: '보기 주소를 바로 열면 그 보기 링크가 고른 표시로 보인다',
  precondition: ['할 일 목록에 「빵 사기」가 있다'],
  params: z.object({
    first: z.string().min(1).describe('먼저 넣어 둘 할 일 — 앞뒤 공백 없는 글자').default('빵 사기'),
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

  await test.step('주소 「#/active」를 바로 연다', async () => {
    await 화면.보기주소열기('#/active');
    await 화면.남은개수.waitFor();
    await verify('주소 「#/active」를 바로 열면 보기 링크 「Active」가 고른 표시로 보인다', await 화면.고른보기인가('Active'), true);
  });

  await test.step('주소 「#/completed」를 바로 연다', async () => {
    await 화면.보기주소열기('#/completed');
    await 화면.남은개수.waitFor();
    await verify('주소 「#/completed」를 바로 열면 보기 링크 「Completed」가 고른 표시로 보인다', await 화면.고른보기인가('Completed'), true);
  });
});
