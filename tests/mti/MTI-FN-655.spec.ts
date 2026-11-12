import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-655',
  name: '일반 회원 토큰으로 offset 을 쓴 검색을 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    검색어: z.string().describe('검색어 — 1자 이상의 글자').default('hana'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=hana&offset=1 을 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=${encodeURIComponent(params.검색어)}&offset=1`, { headers: 머리(토큰) });
    await verify('일반 회원 토큰으로 offset 을 쓴 검색을 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
