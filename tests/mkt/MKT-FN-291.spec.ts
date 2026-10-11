import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 계정값 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-291',
  name: '로그인한 채 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다',
  precondition: ['회원으로 로그인한 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 계정 = 계정값(params);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(request, 계정.loginId, 계정.password);
  });

  await test.step('로그인한 요청인지 확인한다', async () => {
    const res = await request.get('/api/session');
    const body = (await res.json()) as { user: { loginId: string } | null };
    await verify('세션에 로그인한 회원이 있다', body.user !== null, true, { blocker: true });
  });

  await test.step('GET /api/auth/me 를 부른다', async () => {
    const res = await request.get('/api/auth/me');
    await verify('GET /api/auth/me 응답 코드가 200 이다', res.status(), 200, { blocker: true });
    const body = (await res.json()) as { loginId?: string };
    await verify('로그인한 채 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다', body.loginId === 계정.loginId, true);
  });
});
