import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-493',
  name: 'POST /api/v1/admin/trends/statuses/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '어드민 키가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    일반회원응답코드: z.number().describe('일반 회원 토큰으로 부를 때 응답 코드').default(403),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('POST /api/v1/admin/trends/statuses/{id}/reject 를 토큰 없이 부른다', async () => {
    const 응답 = await request.post(`/api/v1/admin/trends/statuses/${없는번호}/reject`);
    await verify('POST /api/v1/admin/trends/statuses/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
  });
  await test.step('POST /api/v1/admin/trends/statuses/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.post(`/api/v1/admin/trends/statuses/${없는번호}/reject`, { headers: 머리(토큰) });
    await verify('POST /api/v1/admin/trends/statuses/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다', 응답.status(), expected.일반회원응답코드);
  });
  await test.step('POST /api/v1/admin/trends/statuses/{id}/reject 를 없는 번호로 부른다', async () => {
    const 응답 = await admin.post(`/api/v1/admin/trends/statuses/${없는번호}/reject`);
    await verify('POST /api/v1/admin/trends/statuses/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
