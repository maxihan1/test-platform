import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인요청, 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-421',
  name: '맞게 로그인하면 200 과 회원 정보로 응답한다',
  precondition: ['새로 만든 회원 계정이 있다'],
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

    await test.step('맞는 아이디 · 비밀번호로 로그인 요청을 보낸다', async () => {
      const 응답 = await 로그인요청(request, 회원.loginId, 회원.password);
      const 본문 = (await 응답.json()) as { loginId?: string };
      await verify(
        '맞게 로그인하면 200 과 회원 정보로 응답한다',
        { 상태: 응답.status(), 아이디: 본문.loginId },
        { 상태: 200, 아이디: 회원.loginId },
      );
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
