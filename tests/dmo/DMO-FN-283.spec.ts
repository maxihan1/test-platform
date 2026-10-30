import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import { 관리자세션인가, 내주문, 담을상품, 브라우저, 운영지급쿠폰수, 주문정리 } from './helpers/notify-flow.helper.js';
import type { 운영상품 } from './helpers/ops-data.helper.js';
import { 쿠폰주기 } from './helpers/ops-data.helper.js';
import { 장바구니담기 } from './helpers/shop-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-283',
  name: '운영 지급 쿠폰으로 주문하면 다음 주문서 쿠폰 목록에 그 쿠폰이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원에게 운영 지급 쿠폰을 주었다'],
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
  let 관리자창: Page | undefined;
  let 회원로그인함 = false;

  try {
    let 상품: 운영상품;

    await test.step('일회용 회원에게 운영 지급 쿠폰을 주고 그 회원으로 로그인한다', async () => {
      const 회원 = await 회원가입(request);
      관리자창 = await 회원창(브라우저(page), params.adminId ?? '', params.adminPassword ?? '');
      열린창.push(관리자창);
      상품 = await 담을상품(관리자창, 50000);
      await 쿠폰주기(관리자창, 회원.loginId, params.할인금액, 0);
      await API로그인(page, 회원.loginId, 회원.password);
      회원로그인함 = true;
      await 장바구니담기(page, 상품.id);
    });

    await test.step('관리자 로그인과 운영 지급 쿠폰을 확인한다', async () => {
      const 로그인 = await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(관리자창!), true);
      const 쿠폰 = await verify('일회용 회원에게 운영 지급 쿠폰을 주었다', await 운영지급쿠폰수(page), 1);
      await verify('관리자 계정으로 로그인해 있고 일회용 회원에게 운영 지급 쿠폰을 주었다', 로그인 && 쿠폰, true, { blocker: true });
    });

    await test.step('그 쿠폰으로 주문한 뒤 다시 주문서를 연다', async () => {
      await 장바구니쪽.열기();
      await 장바구니쪽.주문하기.click();
      await 주문서.쿠폰단계까지();
      await 주문서.운영지급쿠폰고르기();
      await 주문서.결제수단고르고다음();
      await 주문서.결제하기누르기();
      await 장바구니담기(page, 상품.id);
      await 장바구니쪽.열기();
      await 장바구니쪽.주문하기.click();
      await 주문서.쿠폰단계까지();
      await verify('운영 지급 쿠폰으로 주문하면 다음 주문서 쿠폰 목록에 그 쿠폰이 보이지 않는다', await 주문서.운영지급쿠폰().count(), 0);
    });
  } finally {
    try {
      if (관리자창 && 회원로그인함) await 주문정리(관리자창, (await 내주문(page)).map((주문) => 주문.id));
    } finally {
      for (const 창 of 열린창) await 창.context().close();
    }
  }
});
