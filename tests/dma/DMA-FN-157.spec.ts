import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기 } from './helpers/cart.helper.js';
import { 장바구니숫자읽기 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 바로구매열기 } from './helpers/order.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-157',
  name: '「바로 구매」를 눌러도 「장바구니 {N}」 숫자는 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    optionProduct: z
      .string()
      .describe('바로 구매할 상품 이름 — 색상 · 사이즈 칩이 있고 품절이 아닌 상품')
      .default('데모 니트 가디건'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세에서 「바로 구매」를 누르고 상품 목록으로 돌아온다', async () => {
    const 앞수 = await 장바구니숫자읽기(driver);
    await 바로구매열기(driver, params.optionProduct);
    await 목록으로돌아가기(driver);
    await verify('「바로 구매」를 눌러도 「장바구니 {N}」 숫자는 그대로다', await 목록.장바구니수(), 앞수);
  });
});
