import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-082',
  name: '「장바구니 {N}」의 N 은 장바구니 화면의 줄 수와 같다',
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

  await test.step('「장바구니 {N}」의 숫자를 읽고 장바구니 화면을 연다', async () => {
    const 숫자 = await 목록.장바구니수();
    const 장바구니 = await 장바구니열기(driver);
    await verify('「장바구니 {N}」의 N 은 장바구니 화면의 줄 수와 같다', await 장바구니.줄수(), 숫자);
  });
});
