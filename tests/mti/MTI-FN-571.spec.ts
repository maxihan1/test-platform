import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-571',
  name: '가입한 앱이 아닌 토큰으로 확인 메일을 다시 보내면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('가입한 앱이 아닌 일반 회원 토큰으로 POST /api/v1/emails/confirmations 를 부른다', async () => {
    const 응답 = await request.post('/api/v1/emails/confirmations', { headers: 머리(토큰) });
    await verify('가입한 앱이 아닌 토큰으로 확인 메일을 다시 보내면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
  });
});
