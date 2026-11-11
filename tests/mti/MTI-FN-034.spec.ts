import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-034',
  name: 'GET /api/v1/annual_reports/{year} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  held: '보류 — 연말 결산이 만들어진 해가 없다(생성 상태가 ineligible 이다)',
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 연도 = '2025';
  await test.step('GET /api/v1/annual_reports/{year} 를 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/annual_reports/${연도}`, { headers: 머리(토큰) });
    await verify('GET /api/v1/annual_reports/{year} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
