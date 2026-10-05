import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 로그아웃요청, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-424',
  name: '로그아웃 요청은 204 로 응답한다',
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
      const 응답 = await request.get('/api/auth/me');
      await verify('로그인한 채 현재 회원 조회를 부르면 200 으로 응답한다', 응답.status(), 200, { blocker: true });
    });

    await test.step('로그아웃 요청을 보낸다', async () => {
      const 응답 = await 로그아웃요청(request);
      await verify('로그아웃 요청은 204 로 응답한다', 응답.status(), 204);
    });

    await test.step('로그아웃한 뒤 현재 회원 조회를 부른다', async () => {
      const 응답 = await request.get('/api/auth/me');
      await verify('로그아웃한 뒤 현재 회원 조회는 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
