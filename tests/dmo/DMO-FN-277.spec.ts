import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import { 담을상품, 브라우저, 운영지급쿠폰수 } from './helpers/notify-flow.helper.js';
import { 쿠폰주기 } from './helpers/ops-data.helper.js';
import { 장바구니 as 장바구니읽기, 장바구니담기 } from './helpers/shop-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-277',
  name: '운영 지급 쿠폰이 회원 주문서 쿠폰 목록에서 기본 쿠폰 두 장 아래에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원에게 운영 지급 쿠폰을 주었고 그 회원 장바구니에 상품이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    할인금액: z.number().int().describe('줄 쿠폰의 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(5000),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 장바구니쪽 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 열린창: Page[] = [];

  try {
    await test.step('일회용 회원에게 운영 지급 쿠폰을 주고 그 회원 장바구니에 상품을 담는다', async () => {
      const 회원 = await 회원가입(request);
      const 관리자창 = await 회원창(브라우저(page), params.adminId ?? '', params.adminPassword ?? '');
      열린창.push(관리자창);
      const 상품 = await 담을상품(관리자창, 50000);
      await 쿠폰주기(관리자창, 회원.loginId, params.할인금액, 0);
      await API로그인(page, 회원.loginId, 회원.password);
      await 장바구니담기(page, 상품.id);
    });

    await test.step('운영 지급 쿠폰과 장바구니 상품을 확인한다', async () => {
      const 쿠폰 = await verify('일회용 회원에게 운영 지급 쿠폰을 주었다', await 운영지급쿠폰수(page), 1);
      const 담김 = await verify('그 회원 장바구니에 상품이 있다', (await 장바구니읽기(page)).length, 1);
      await verify('일회용 회원에게 운영 지급 쿠폰을 주었고 그 회원 장바구니에 상품이 있다', 쿠폰 && 담김, true, { blocker: true });
    });

    await test.step('그 회원으로 주문서 쿠폰 목록을 연다', async () => {
      await 장바구니쪽.열기();
      await 장바구니쪽.주문하기.click();
      await 주문서.쿠폰단계까지();
      await verify('운영 지급 쿠폰이 회원 주문서 쿠폰 목록에서 기본 쿠폰 두 장 아래에 보인다', await 주문서.운영지급쿠폰앞쿠폰수(), 2);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});
