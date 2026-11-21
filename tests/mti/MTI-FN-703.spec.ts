import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-703',
  name: 'POST /oauth/userinfo 를 profile 범위 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['profile 범위 토큰이 있다'],
  params: z.object({
    profilePassword: z.string().describe('profile 범위 토큰').optional().meta({ secret: true, account: 'profile 범위 토큰' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('profile 범위 토큰으로 부를 때 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.profilePassword ?? '';
  await test.step('POST /oauth/userinfo 를 profile 범위 토큰으로 부른다', async () => {
    const 응답 = await request.post(`/oauth/userinfo`, { headers: 머리(토큰) });
    await verify('POST /oauth/userinfo 를 profile 범위 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
