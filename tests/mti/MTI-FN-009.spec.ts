import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-009',
  name: 'POST /oauth/userinfo 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  held: '보류 — profile 범위를 받은 사용자 토큰이 없다(계정 줄 토큰 범위는 read write follow push)',
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('POST /oauth/userinfo 를 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.post(`/oauth/userinfo`, { headers: 머리(토큰) });
    await verify('POST /oauth/userinfo 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
