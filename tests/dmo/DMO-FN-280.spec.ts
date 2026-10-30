import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입, 회원창 } from './helpers/account.helper.js';
import { 담을상품, 브라우저, 운영지급쿠폰수 } from './helpers/notify-flow.helper.js';
import type { 운영상품 } from './helpers/ops-data.helper.js';
import { 쿠폰주기 } from './helpers/ops-data.helper.js';
import { 장바구니 as 장바구니읽기, 장바구니담기 } from './helpers/shop-data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-280',
  name: '상품 금액보다 큰 운영 지급 쿠폰을 고르면 할인 금액이 상품 금액과 같다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원에게 할인 50,000원 운영 지급 쿠폰을 주었고 그보다 싼 상품을 장바구니에 담았다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 장바구니쪽 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 열린창: Page[] = [];

  try {
    let 상품: 운영상품;

    await test.step('일회용 회원에게 할인 50,000원 운영 지급 쿠폰을 주고 그보다 싼 상품을 장바구니에 담는다', async () => {
      const 회원 = await 회원가입(request);
      const 관리자창 = await 회원창(브라우저(page), params.adminId ?? '', params.adminPassword ?? '');
      열린창.push(관리자창);
      상품 = await 담을상품(관리자창, 50000);
      await 쿠폰주기(관리자창, 회원.loginId, 50000, 0);
      await API로그인(page, 회원.loginId, 회원.password);
      await 장바구니담기(page, 상품.id);
    });

    await test.step('운영 지급 쿠폰과 장바구니 상품을 확인한다', async () => {
      const 쿠폰 = await verify('일회용 회원에게 할인 50,000원 운영 지급 쿠폰을 주었다', await 운영지급쿠폰수(page), 1);
      const 담김 = await verify(
        '그보다 싼 상품을 장바구니에 담았다',
        상품.salePrice < 50000 && (await 장바구니읽기(page)).some((줄) => 줄.productId === 상품.id),
        true,
      );
      await verify('일회용 회원에게 할인 50,000원 운영 지급 쿠폰을 주었고 그보다 싼 상품을 장바구니에 담았다', 쿠폰 && 담김, true, { blocker: true });
    });

    await test.step('장바구니에서 주문서의 쿠폰 단계까지 간다', async () => {
      await 장바구니쪽.열기();
      await 장바구니쪽.주문하기.click();
      await 주문서.쿠폰단계까지();
    });

    await test.step('그 회원 주문서에서 그 쿠폰을 고른다', async () => {
      await 주문서.운영지급쿠폰고르기();
      await 주문서.결제수단고르고다음();
      const 할인금액 = Number((await 주문서.쿠폰할인.innerText()).replace(/\D/g, ''));
      await verify('상품 금액보다 큰 운영 지급 쿠폰을 고르면 할인 금액이 상품 금액과 같다', 할인금액, 상품.salePrice);
    });
  } finally {
    for (const 창 of 열린창) await 창.context().close();
  }
});
