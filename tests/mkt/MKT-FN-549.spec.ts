import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-549',
  name: '관리자가 주문 CSV 를 부르면 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」인 CSV 가 온다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호가 실행 환경에 없다(테스트 계정은 회원 하나다)',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ request, params }) => {
  await test.step('관리자 계정으로 로그인한다', async () => {
    await API로그인(request, params.adminLoginId, params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    const 나 = (await (await request.get('/api/auth/me')).json()) as { role?: string };
    await verify('관리자 계정으로 로그인해 있다', 나.role, 'admin', { blocker: true });
  });

  await test.step('관리자로 주문 CSV /api/admin/orders.csv 를 부른다', async () => {
    const 응답 = await request.get('/api/admin/orders.csv');
    await verify(
      '관리자가 주문 CSV 를 부르면 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」인 CSV 가 온다',
      [응답.status(), ((await 응답.text()).split(/\r?\n/)[0] ?? '').replace(/^\uFEFF/, '')],
      [200, '주문번호,주문일,아이디,결제금액,상태'],
    );
  });
});
