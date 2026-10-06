import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-430',
  name: '아이디와 이메일이 맞는 비밀번호 찾기 요청은 성공으로 응답한다',
  precondition: ['비회원이다', '새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만든다', async () => {
      await 임시회원가입(request, 회원);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(request, 회원.loginId), true, { blocker: true });
    });

    await test.step('그 회원의 아이디와 이메일로 비밀번호 찾기 요청을 보낸다', async () => {
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 회원.loginId, email: 회원.email } });
      await verify('아이디와 이메일이 맞는 비밀번호 찾기 요청은 성공으로 응답한다', 응답.ok(), true);
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
