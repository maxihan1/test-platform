import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫번호 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-210',
  name: 'GET /api/v1/notifications/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원에게 알림이 있다'],
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
  번호 = await 첫번호(request, 토큰, '/api/v1/notifications');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('일반 회원에게 알림이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/notifications/{id} 를 일반 회원 토큰으로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/notifications/${번호}`, { headers: 머리(토큰) });
    await verify('GET /api/v1/notifications/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
