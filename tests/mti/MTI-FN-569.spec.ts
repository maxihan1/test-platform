import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-569',
  name: '한도 안에서 홈 타임라인을 부르면 X-RateLimit-Limit 헤더가 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/timelines/home 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/home', { headers: 머리(토큰) });
    await verify('한도 안에서 홈 타임라인을 부르면 X-RateLimit-Limit 헤더가 있다', 응답.headers()['x-ratelimit-limit'] !== undefined, true);
    await verify('X-RateLimit-Remaining 헤더가 있다', 응답.headers()['x-ratelimit-remaining'] !== undefined, true);
    await verify('X-RateLimit-Reset 헤더가 있다', 응답.headers()['x-ratelimit-reset'] !== undefined, true);
  });
});
