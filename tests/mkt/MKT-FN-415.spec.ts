import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입요청, 임시회원정보, 임시회원지우기 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-415',
  name: '새 아이디로 가입 요청을 보내면 201 로 응답한다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = 임시회원정보();

  try {
    await test.step('쓰지 않은 새 아이디로 회원가입 요청을 보낸다', async () => {
      const 응답 = await 가입요청(request, 회원);
      await verify('새 아이디로 가입 요청을 보내면 201 로 응답한다', 응답.status(), 201);
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
