import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-335',
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
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });

  await test.step('관리자 계정으로 로그인한다', async () => {
    await API로그인(request, 관리자계정.loginId, 관리자계정.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정 세션이 있다', (await 내정보(request)).loginId === 관리자계정.loginId, true, { blocker: true });
  });

  await test.step('GET /api/admin/orders.csv 를 부른다', async () => {
    const 응답 = await request.get('/api/admin/orders.csv');
    await verify('관리자가 GET /api/admin/orders.csv 를 부르면 CSV 가 돌아온다', 응답.status() === 200 && (응답.headers()['content-type'] ?? '').includes('csv'), true);
  });
});
