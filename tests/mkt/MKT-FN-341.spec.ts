import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-341',
  name: '로그인 응답 본문에 보낸 비밀번호가 없다',
  precondition: ['로그인하지 않은 요청이다', '회원으로 로그인한 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 계정 = 계정값(params);

  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호로 POST /api/auth/login 응답을 받는다', async () => {
    const 응답 = await request.post('/api/auth/login', { data: { loginId: 계정.loginId, password: 계정.password, remember: false } });
    await verify('로그인 응답 본문에 보낸 비밀번호가 없다', (await 응답.text()).includes(계정.password), false);
  });

  await test.step('로그인한 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 맞다', (await 요청세션아이디(request)) === 계정.loginId, true, { blocker: true });
  });

  await test.step('GET /api/auth/me 응답을 받는다', async () => {
    const 응답 = await request.get('/api/auth/me');
    const 본문 = (await 응답.json()) as Record<string, unknown>;
    await verify('회원 정보 응답에 비밀번호 칸이 없다', Object.keys(본문).some((칸) => 칸.toLowerCase().includes('password')), false);
  });

  await test.step('맞는 비밀번호로 POST /api/me/verify-password 응답을 받는다', async () => {
    const 응답 = await request.post('/api/me/verify-password', { data: { password: 계정.password } });
    await verify('비밀번호 재확인 응답 본문에 보낸 비밀번호가 없다', (await 응답.text()).includes(계정.password), false);
  });
});
