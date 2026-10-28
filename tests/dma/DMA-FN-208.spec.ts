import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 기본줄있나, 스마트워치, 체크한줄금액합 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-208',
  name: '「상품 금액」은 체크한 줄 금액의 합이다',
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

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('장바구니를 연다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 둘 이상 있다', await 기본줄있나(장바구니), true, { blocker: true });
  });

  await test.step('한 줄의 체크를 끈다', async () => {
    const 앞금액 = await 장바구니.상품금액값();
    await 장바구니.줄체크누르기(await 장바구니.줄꼭찾기(스마트워치));
    await 될때까지기다려보기(driver, async () => (await 장바구니.상품금액값()) !== 앞금액);
    await verify('「상품 금액」은 체크한 줄 금액의 합이다', await 장바구니.상품금액값(), await 체크한줄금액합(장바구니));
  }, { capture: true });
});
