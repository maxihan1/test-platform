import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-336',
  name: '회원이 GET /api/admin/orders.csv 를 부르면 403 으로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인한 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 계정 = 계정값(params);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('GET /api/admin/orders.csv 를 부른다', async () => {
    const 응답 = await request.get('/api/admin/orders.csv');
    await verify('회원이 GET /api/admin/orders.csv 를 부르면 403 으로 응답한다', 응답.status(), 403);
  });
});
