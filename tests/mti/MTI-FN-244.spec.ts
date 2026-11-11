import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 푸시구독내용, 푸시구독지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-244',
  name: 'POST /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
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
  try {
    await test.step('POST /api/v1/push/subscription 을 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/push/subscription', { headers: 머리(토큰), data: 푸시구독내용() });
      await verify('POST /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 푸시구독지우기(request, 토큰);
  }
});
