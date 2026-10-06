import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 로그인요청, 임시회원가입, 임시회원정보, 임시회원지우기, 아이디사용중인가, 틀린로그인 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-423',
  name: '비밀번호가 틀리면 로그인 요청이 401 로 응답한다',
  techniques: ['동등 분할', '상태 전이'],
  precondition: ['새로 만든 회원 계정이 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = 임시회원정보();

  try {
    await test.step('요청으로 새 회원 계정을 만들고 잠기기 전에 로그인해 둔다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원 계정이 있는지 확인한다', async () => {
      await verify('새로 만든 회원의 아이디는 이미 쓰고 있다', await 아이디사용중인가(request, 회원.loginId), true, { blocker: true });
    });

    await test.step('틀린 비밀번호로 로그인 요청을 보낸다', async () => {
      const 응답 = await 로그인요청(request, 회원.loginId, 'Wrong!pw0');
      await verify('비밀번호가 틀리면 로그인 요청이 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('틀린 비밀번호 로그인 요청을 다섯 번 보낸 뒤 맞는 비밀번호로 보낸다', async () => {
      await 틀린로그인(request, 회원.loginId, 5);
      const 응답 = await 로그인요청(request, 회원.loginId, 회원.password);
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('잠긴 계정의 로그인 요청은 423 · 「LOCKED」로 응답한다', { 상태: 응답.status(), 코드: 본문.code }, { 상태: 423, 코드: 'LOCKED' });
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
