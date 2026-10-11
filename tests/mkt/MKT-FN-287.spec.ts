import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-287',
  name: '맞는 아이디와 비밀번호로 POST /api/auth/login 을 보내면 200 으로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
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

  await test.step('맞는 아이디와 비밀번호로 POST /api/auth/login 을 부른다', async () => {
    const 응답 = await request.post('/api/auth/login', { data: { loginId: 계정.loginId, password: 계정.password, remember: false } });
    await verify('맞는 아이디와 비밀번호로 POST /api/auth/login 을 보내면 200 으로 응답한다', 응답.status(), 200);
  });
});
