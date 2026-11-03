import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';

export const spec = defineCase({
  tcId: 'DMO-UI-005',
  name: '주문 관리 화면에 왼쪽 메뉴의 「주문」이 강조되어 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 틀 = new 운영틀(page);

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
  });

  await test.step('/ops/orders 를 연다', async () => {
    await page.goto('/ops/orders');
    await 틀.다그려질때까지();
    await verify('주문 관리 화면에 왼쪽 메뉴의 「주문」이 강조되어 보인다', await 틀.지금메뉴.filter({ hasText: '주문' }).isVisible(), true);
  });
});
