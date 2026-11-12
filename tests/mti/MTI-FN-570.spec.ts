import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-570',
  name: '글을 쓰면 응답에 X-RateLimit-Limit 헤더가 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  let 글 = '';
  try {
    await test.step('일반 회원 토큰으로 POST /api/v1/statuses 로 글을 쓴다', async () => {
      const 응답 = await request.post('/api/v1/statuses', { headers: 머리(토큰), data: { status: 'MTI 한도 헤더 시험 글', visibility: 'unlisted' } });
      글 = ((await 응답.json()) as { id?: string }).id ?? '';
      await verify('글을 쓰면 응답에 X-RateLimit-Limit 헤더가 있다', 응답.headers()['x-ratelimit-limit'] !== undefined, true);
    });
  } finally {
    await 글지우기(request, 토큰, 글);
  }
});
