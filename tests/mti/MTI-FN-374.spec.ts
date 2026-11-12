import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-374',
  name: 'GET /api/v1/donation_campaigns 를 일반 회원 토큰으로 부르면 응답 코드가 200 이나 204 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    정상응답코드: z.number().describe('후원 캠페인이 있을 때 응답 코드').default(200),
    설정없음응답코드: z.number().describe('후원 설정이 없을 때 응답 코드').default(204),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('GET /api/v1/donation_campaigns 를 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.get('/api/v1/donation_campaigns', { headers: 머리(토큰) });
    await verify('GET /api/v1/donation_campaigns 를 일반 회원 토큰으로 부르면 응답 코드가 200 이나 204 다', 응답.status() === expected.정상응답코드 || 응답.status() === expected.설정없음응답코드, true);
  });
});
