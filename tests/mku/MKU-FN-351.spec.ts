import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-351',
  name: '관리자가 GET /api/admin/orders.csv 를 부르면 CSV 가 돌아온다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자로 로그인한 요청이다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 관리자 = 관리자값(params);
  await test.step('관리자로 로그인한다', async () => {
    await API로그인(request, 관리자.loginId, 관리자.password);
  });

  await test.step('관리자로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자인가(request), true, { blocker: true });
  });

  await test.step('GET /api/admin/orders.csv 를 부른다', async () => {
    const 응답 = await request.get('/api/admin/orders.csv');
    await verify('관리자가 GET /api/admin/orders.csv 를 부르면 CSV 가 돌아온다', 응답.status() === 200 && (응답.headers()['content-type'] ?? '').includes('csv'), true);
  });
});
