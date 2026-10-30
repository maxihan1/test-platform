import { defineCase, test, verify } from '@platform/kit';
import type { Page } from '@playwright/test';
import { z } from 'zod';

import { API로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나, 회원창열기 } from './helpers/orders-flow.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 회원주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-117',
  name: '배송중 주문의 회원 주문 상세에 주문 취소 버튼이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: [
    '일회용 회원에게 배송중 주문이 있고 그 회원으로 로그인해 있다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = { loginId: '', password: '' };
  let 주문 = '';
  let 회원쪽: Page | undefined;

  try {
    await test.step('일회용 회원에게 배송중 주문을 만든다', async () => {
      await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
      const 가입 = await 회원가입(request);
      회원.loginId = 가입.loginId;
      회원.password = 가입.password;
      주문 = await 주문하나(page, 회원.loginId, '배송중');
    });

    await test.step('일회용 회원으로 로그인해 주문 내역에서 배송중 주문을 확인한다', async () => {
      회원쪽 = await 회원창열기(page, 회원.loginId, 회원.password);
      const 내역 = new 주문내역화면(회원쪽);
      await 내역.열기();
      await 내역.주문줄(주문).waitFor();
      await verify('일회용 회원에게 배송중 주문이 있고 그 회원으로 로그인해 있다', (await 내역.상태(주문).innerText()).trim(), '배송중', { blocker: true });
    });

    await test.step('그 주문 상세를 연다', async () => {
      if (!회원쪽) throw new Error('일회용 회원 창이 열려 있지 않다');
      const 상세 = new 회원주문상세화면(회원쪽);
      await 상세.열기(주문);
      const 열림 = await verify('배송중 주문의 회원 주문 상세가 열린다', await 상세.주문상품제목.isVisible(), true);
      const 없음 = await verify('주문 취소 버튼이 보이지 않는다', await 상세.주문취소버튼.isVisible(), false);
      await verify('배송중 주문의 회원 주문 상세에 주문 취소 버튼이 보이지 않는다', 열림 && 없음, true);
    });
  } finally {
    await 회원쪽?.context().close();
  }
});
