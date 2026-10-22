import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, type 장바구니줄 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 배송비, 장바구니다시열기, 장바구니열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-347',
  name: '「상품 금액」이 49,999원이면 「배송비」가 3,000원이다',
  platforms: ['android'],
  precondition: ['「상품 금액」이 49,999원인 장바구니다', '「상품 금액」이 50,000원인 장바구니다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    아래상품번호: z.number().describe('상품 금액 49,999원이 되는 상품 번호'),
    아래수량: z.number().describe('상품 금액 49,999원이 되는 수량'),
    경계상품번호: z.number().describe('상품 금액 50,000원이 되는 상품 번호'),
    경계수량: z.number().describe('상품 금액 50,000원이 되는 수량'),
  }),
  expected: null,
  held: '보류 — 상품 금액이 49,999원 · 50,000원이 되는 상품이 데모 데이터에 없다',
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  try {
    await test.step('서버 장바구니에 「상품 금액」 49,999원어치를 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [{ productId: params.아래상품번호, qty: params.아래수량 }]);
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니열기(driver);
      const 장바구니 = new 장바구니화면(driver);
      await verify('「상품 금액」이 49,999원인 장바구니가 보인다', await 장바구니.상품금액글(), 원(49999), { blocker: true });

      await 장바구니.배송비바뀔때까지(원(배송비(49999, 1)));
      await verify('「상품 금액」이 49,999원이면 「배송비」가 3,000원이다', await 장바구니.배송비글(), 원(배송비(49999, 1)));
    });

    await test.step('서버 장바구니를 「상품 금액」 50,000원어치로 바꾸고 장바구니를 다시 연다', async () => {
      await 장바구니바꾸기(request, [{ productId: params.경계상품번호, qty: params.경계수량 }]);
      await 장바구니다시열기(driver);
    });

    await test.step('「상품 금액」이 50,000원일 때 「배송비」를 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      await verify('「상품 금액」이 50,000원인 장바구니가 보인다', await 장바구니.상품금액글(), 원(50000), { blocker: true });

      await 장바구니.배송비바뀔때까지(원(배송비(50000, 1)));
      await verify('「상품 금액」이 50,000원이면 「배송비」가 0원이다', await 장바구니.배송비글(), 원(배송비(50000, 1)));
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
