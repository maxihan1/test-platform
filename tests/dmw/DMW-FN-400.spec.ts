import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할, 역할로그인 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-400',
  name: '관리자가 주문 CSV API 를 부르면 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」인 CSV 를 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('관리자 계정으로 로그인한다', async () => {
    await 역할로그인(page.request, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자로 GET /api/admin/orders.csv 를 부른다', async () => {
    const 응답 = await page.request.get('/api/admin/orders.csv');
    const 글 = await 응답.text();
    await verify('관리자가 주문 CSV API 를 부르면 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」인 CSV 를 준다', 글.split(/\r?\n/)[0], '주문번호,주문일,아이디,결제금액,상태');
  });
});
