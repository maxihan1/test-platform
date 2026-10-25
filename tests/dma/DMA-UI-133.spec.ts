import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-133',
  name: '상품 목록 버튼 반응',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 「장바구니 {N}」을 누른다', async () => {
    await 목록.장바구니누르기();
    const 장바구니 = new 장바구니화면(driver);
    await 장바구니.열릴때까지().catch(() => undefined);
    await verify('상품 목록에서 「장바구니 {N}」을 누르면 장바구니 화면으로 간다', await 장바구니.보이나(), true);
    await driver.back();
    await 목록.열릴때까지();
  });

  await test.step('상품 목록에서 「주문 내역」을 누른다', async () => {
    await 목록.주문내역누르기();
    const 내역 = new 주문내역화면(driver);
    await 내역.열릴때까지().catch(() => undefined);
    await verify('상품 목록에서 「주문 내역」을 누르면 주문 내역 화면으로 간다', await 내역.보이나(), true);
    await driver.back();
    await 목록.열릴때까지();
  });

  await test.step('상품 목록에서 상품 카드를 누른다', async () => {
    await 목록.첫상품열기();
    const 상세 = new 상품상세화면(driver);
    await 상세.열릴때까지().catch(() => undefined);
    await verify('상품 목록에서 상품 카드를 누르면 상품 상세로 간다', await 상세.보이나(), true);
    await driver.back();
    await 목록.열릴때까지();
  });

  await test.step('상품 목록에서 「로그아웃」을 누른다', async () => {
    await 목록.로그아웃누르기();
    const 로그인 = new 로그인화면(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('상품 목록에서 「로그아웃」을 누르면 로그인 화면으로 간다', await 로그인.보이나(), true);
  });
});
