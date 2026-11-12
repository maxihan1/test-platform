import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-041',
  name: 'POST /api/v1/annual_reports/{year}/generate 를 토큰 없이 부르면 응답 코드가 401 이다',
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
  await test.step('POST /api/v1/annual_reports/{year}/generate 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/annual_reports/${'2025'}/generate`);
    await verify('POST /api/v1/annual_reports/{year}/generate 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
  await test.step('POST /api/v1/annual_reports/{year}/generate 를 없는 연도로 부른다', async () => {
    const 응답 = await request.post(`/api/v1/annual_reports/${'1900'}/generate`, { headers: 머리(토큰) });
    await verify('POST /api/v1/annual_reports/{year}/generate 를 없는 연도로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
