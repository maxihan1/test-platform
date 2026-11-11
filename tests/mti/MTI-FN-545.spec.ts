import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-545',
  name: '차단 목록을 limit=80 으로 부르면 Link 헤더에 rel="next" 가 없다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    다음쪽링크있음: z.boolean().describe('다음 쪽 링크가 있는지').default(false),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/blocks?limit=80 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/blocks?limit=80', { headers: 머리(토큰) });
    await verify('차단 목록을 limit=80 으로 부르면 Link 헤더에 rel="next" 가 없다', (응답.headers()['link'] ?? '').includes('rel="next"'), expected.다음쪽링크있음);
  });
});
