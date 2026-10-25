import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 상품담기, 장바구니수량되돌리기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-402',
  name: '상품 금액이 49,999원이면 배송비는 「배송비 3,000원」이다',
  platforms: ['android'],
  held: '보류 — 상품 금액을 49,999원 · 50,000원으로 맞출 상품이 자료에 없다',
  techniques: ['경계값 분석'],
  precondition: ['체크한 줄의 상품 금액이 49,999원이다', '체크한 줄의 상품 금액이 50,000원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    lowProduct: z.string().describe('상품 금액을 49,999원으로 맞출 상품 이름'),
    lowQuantity: z.number().describe('상품 금액을 49,999원으로 맞출 수량'),
    exactProduct: z.string().describe('상품 금액을 50,000원으로 맞출 상품 이름'),
    exactQuantity: z.number().describe('상품 금액을 50,000원으로 맞출 수량'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);
  let 담았나 = false;

  try {
    await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
    });

    await test.step('금액을 맞출 상품을 장바구니에 담는다', async () => {
      담았나 = true;
      await 장바구니줄지우기(driver, params.lowProduct);
      await 장바구니줄지우기(driver, params.exactProduct);
      await 상품담기(driver, params.lowProduct);
      if (params.exactProduct !== params.lowProduct) await 상품담기(driver, params.exactProduct);
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니열기(driver);
      const 낮은줄 = await 장바구니.줄찾기(params.lowProduct);
      const 정확한줄 = await 장바구니.줄찾기(params.exactProduct);
      await verify('장바구니에 금액을 맞출 상품 줄이 있다', 낮은줄 !== undefined && 정확한줄 !== undefined, true, { blocker: true });
    });

    await test.step('배송비를 확인한다', async () => {
      await 장바구니수량되돌리기(driver, params.lowProduct, params.lowQuantity);
      await 장바구니.한줄만체크(params.lowProduct);
      await verify('체크한 줄의 상품 금액이 49,999원이다', await 장바구니.상품금액값(), 49999, { blocker: true });
      await verify('상품 금액이 49,999원이면 배송비는 「배송비 3,000원」이다', await 장바구니.배송비글(), '배송비 3,000원');

      await 장바구니수량되돌리기(driver, params.exactProduct, params.exactQuantity);
      await 장바구니.한줄만체크(params.exactProduct);
      await verify('체크한 줄의 상품 금액이 50,000원이다', await 장바구니.상품금액값(), 50000, { blocker: true });
      await verify('상품 금액이 50,000원이면 배송비는 「배송비 0원」이다', await 장바구니.배송비글(), '배송비 0원');
    }, { capture: true });
  } finally {
    if (담았나) {
      await 목록으로돌아가기(driver);
      await 장바구니줄지우기(driver, params.lowProduct);
      await 장바구니줄지우기(driver, params.exactProduct);
    }
  }
});
