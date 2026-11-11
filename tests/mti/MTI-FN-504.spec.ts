import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 비동기갱신번호 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-504',
  name: 'GET /api/v1_alpha/async_refreshes/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  held: '보류 — 비동기 갱신 번호를 주는 원격 글이 없다',
  precondition: ['일반 회원 토큰이 있다', '비동기 갱신 번호가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 비동기갱신번호(request, 토큰);
  await test.step('비동기 갱신 번호를 확인한다', async () => {
    await verify('비동기 갱신 번호가 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1_alpha/async_refreshes/{id} 를 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.get(`/api/v1_alpha/async_refreshes/${번호}`, { headers: 머리(토큰) });
    await verify('GET /api/v1_alpha/async_refreshes/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
