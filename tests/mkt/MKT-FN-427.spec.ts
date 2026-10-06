import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-427',
  name: '로그인한 채 부르면 현재 회원의 아이디가 온다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      const 응답 = await request.get('/api/session');
      const 본문 = (await 응답.json()) as { user: unknown };
      await verify('세션에 로그인한 회원이 들어 있다', 본문.user !== null, true, { blocker: true });
    });

    await test.step('현재 회원 조회 /api/auth/me 를 부른다', async () => {
      const 응답 = await request.get('/api/auth/me');
      const 본문 = (await 응답.json()) as { loginId?: string };
      await verify('로그인한 채 부르면 현재 회원의 아이디가 온다', 본문.loginId, 회원.loginId);
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
