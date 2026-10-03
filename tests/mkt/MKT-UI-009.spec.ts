import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-009',
  name: '로그인 화면의 모든 입력칸이 이름표(label)와 연결돼 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    unlabeled: z.number().describe('이름표가 없는 입력칸 수').default(0),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
    await verify('로그인 화면의 모든 입력칸이 이름표(label)와 연결돼 있다', await 화면.이름표없는입력칸수(), expected.unlabeled);
  });
});
