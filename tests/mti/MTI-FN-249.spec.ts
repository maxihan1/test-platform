import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 푸시구독만들기, 푸시구독지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-249',
  name: 'PUT /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '일반 회원의 푸시 구독이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  번호 = await 푸시구독만들기(request, 토큰);
  try {
    await test.step('시험 푸시 구독 번호를 확인한다', async () => {
      await verify('일반 회원의 푸시 구독이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('PUT /api/v1/push/subscription 을 토큰 없이 부른다', async () => {
      const 응답 = await request.put(`/api/v1/push/subscription`, { data: { data: { alerts: { mention: false, follow: true } } } });
      await verify('PUT /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
    });
  } finally {
    await 푸시구독지우기(request, 토큰);
  }
});
