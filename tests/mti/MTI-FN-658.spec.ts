import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-658',
  name: '문법이 틀린 검색어로 검색하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    검색어: z.string().describe('문법이 틀린 검색어 — 값 없이 연산자 from: 만 적은 글자').default('from:'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=from: 을 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=${encodeURIComponent(params.검색어)}`, { headers: 머리(토큰) });
    await verify('문법이 틀린 검색어로 검색하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
  });
});
