import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import { 담을상품, 브라우저, 운영지급쿠폰수 } from './helpers/notify-flow.helper.js';
import { 쿠폰주기, 회원번호 } from './helpers/ops-data.helper.js';
import { 장바구니담기 } from './helpers/shop-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-291',
  name: '다른 회원에게 준 운영 지급 쿠폰은 내 주문서 쿠폰 목록에 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원 둘이 있고 앞 회원에게 운영 지급 쿠폰을 주었다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    할인금액: z.number().int().describe('앞 회원에게 줄 쿠폰의 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(5000),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 장바구니쪽 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 열린창: Page[] = [];

  try {
    let 앞쪽: Page;
    let 관리자창: Page;
    let 앞아이디 = '';
    let 뒤아이디 = '';

    await test.step('일회용 회원 둘을 만들어 앞 회원에게 운영 지급 쿠폰을 주고 뒤 회원으로 로그인한다', async () => {
      const 앞 = await 회원가입(request);
      const 뒤 = await 회원가입(request);
      앞아이디 = 앞.loginId;
      뒤아이디 = 뒤.loginId;
      관리자창 = await 회원창(브라우저(page), params.adminId ?? '', params.adminPassword ?? '');
      열린창.push(관리자창);
      const 상품 = await 담을상품(관리자창, 50000);
      await 쿠폰주기(관리자창, 앞.loginId, params.할인금액, 0);
      앞쪽 = await 회원창(브라우저(page), 앞.loginId, 앞.password);
      열린창.push(앞쪽);
      await API로그인(page, 뒤.loginId, 뒤.password);
      await 장바구니담기(page, 상품.id);
    });

    await test.step('일회용 회원 둘과 앞 회원의 운영 지급 쿠폰을 확인한다', async () => {
      const 앞번호 = await 회원번호(관리자창, 앞아이디);
      const 뒤번호 = await 회원번호(관리자창, 뒤아이디);
      const 둘 = await verify('일회용 회원 둘이 있다', 앞번호 > 0 && 뒤번호 > 0 && 앞번호 !== 뒤번호, true);
      const 쿠폰 = await verify('앞 회원에게 운영 지급 쿠폰을 주었다', await 운영지급쿠폰수(앞쪽), 1);
      await verify('일회용 회원 둘이 있고 앞 회원에게 운영 지급 쿠폰을 주었다', 둘 && 쿠폰, true, { blocker: true });
    });

    await test.step('뒤 회원으로 주문서 쿠폰 목록을 연다', async () => {
      await 장바구니쪽.열기();
      await 장바구니쪽.주문하기.click();
      await 주문서.쿠폰단계까지();
      await verify('다른 회원에게 준 운영 지급 쿠폰은 내 주문서 쿠폰 목록에 보이지 않는다', await 주문서.운영지급쿠폰().count(), 0);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});
