import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-505',
  name: 'GET /api/v1_alpha/async_refreshes/{id} 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('GET /api/v1_alpha/async_refreshes/{id} 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1_alpha/async_refreshes/${없는번호}`);
    await verify('GET /api/v1_alpha/async_refreshes/{id} 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
  await test.step('GET /api/v1_alpha/async_refreshes/{id} 를 없는 번호로 부른다', async () => {
    const 응답 = await request.get(`/api/v1_alpha/async_refreshes/${없는번호}`, { headers: 머리(토큰) });
    await verify('GET /api/v1_alpha/async_refreshes/{id} 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
