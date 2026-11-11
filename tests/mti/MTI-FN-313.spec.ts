import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 필터만들기, 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-313',
  name: 'GET /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 만든 필터가 있다'],
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
  번호 = (await 필터만들기(request, 토큰)).id;
  try {
    await test.step('시험 필터 번호를 확인한다', async () => {
      await verify('일반 회원이 만든 필터가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('GET /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.get(`/api/v2/filters/${번호}/statuses`, { headers: 머리(토큰) });
      await verify('GET /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 필터지우기(request, 토큰, 번호);
  }
});
