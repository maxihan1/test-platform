import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-702',
  name: 'API 문서대로 GET /api/v1/timelines/direct 를 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  held: '판정 불가 — 자료 어긋남: 기획서 라우트 없음(404 추정) · 문서 200',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/timelines/direct 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/direct', { headers: 머리(토큰) });
    await verify('API 문서대로 GET /api/v1/timelines/direct 를 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
