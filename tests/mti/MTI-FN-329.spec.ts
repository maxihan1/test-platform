import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 옛필터만들기, 옛필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-329',
  name: 'DELETE /api/v1/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 만든 구버전 필터가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  번호 = await 옛필터만들기(request, 토큰);
  try {
    await test.step('시험 구버전 필터 번호를 확인한다', async () => {
      await verify('일반 회원이 만든 구버전 필터가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/filters/{id} 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/filters/${번호}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 옛필터지우기(request, 토큰, 번호);
  }
});
