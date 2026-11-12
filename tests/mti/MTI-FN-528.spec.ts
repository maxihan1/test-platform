import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기 } from './helpers/account.helper.js';
import { 고유이름, 머리 } from './helpers/auth.helper.js';
import { 가입본문 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-528',
  name: '일반 회원 토큰으로 가입을 부르면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
    오류문구: z.string().describe('오류 문구').default('This method requires an client credentials authentication'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 이름 = 고유이름('mti_');
  try {
    await test.step('일반 회원 토큰으로 POST /api/v1/accounts 를 부른다', async () => {
      const 응답 = await request.post('/api/v1/accounts', { headers: 머리(토큰), data: 가입본문(이름) });
      await verify('일반 회원 토큰으로 가입을 부르면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('오류 문구가 「This method requires an client credentials authentication」 다', 몸.error, expected.오류문구);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});
