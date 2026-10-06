import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입요청, 임시회원정보, 임시회원지우기 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-417',
  name: '아이디가 겹치는 가입 요청은 409 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = { ...임시회원정보(), loginId: 'user2' };
  let 상태 = 0;

  try {
    await test.step('아이디 「user2」로 회원가입 요청을 보낸다', async () => {
      const 응답 = await 가입요청(request, 회원);
      상태 = 응답.status();
      await verify('아이디가 겹치는 가입 요청은 409 로 응답한다', 상태, 409);
    });
  } finally {
    if (상태 === 201) await 임시회원지우기(request, 회원);
  }
});
