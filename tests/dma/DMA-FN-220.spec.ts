import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 기본줄있나, 스마트워치 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-220',
  name: '「주문하기」를 누르면 체크한 줄만으로 주문하기 화면이 열린다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 둘 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('장바구니를 연다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 둘 이상 있다', await 기본줄있나(장바구니), true, { blocker: true });
  });

  await test.step('한 줄만 체크하고 「주문하기」를 누른다', async () => {
    await 장바구니.한줄만체크(스마트워치);
    await 장바구니.주문하기누르기();
    await 주문하기.열릴때까지().catch(() => undefined);
    const 줄글 = await 주문하기.주문상품줄글들();
    const 열림 = await verify('주문하기 화면이 열린다', await 주문하기.보이나(), true);
    const 줄수 = await verify('주문 상품은 한 줄이다', 줄글.length, 1);
    const 상품 = await verify('주문 상품은 체크한 줄의 상품이다', 줄글.join(', ').includes(스마트워치), true);
    await verify('「주문하기」를 누르면 체크한 줄만으로 주문하기 화면이 열린다', 열림 && 줄수 && 상품, true);
  }, { capture: true });
});
