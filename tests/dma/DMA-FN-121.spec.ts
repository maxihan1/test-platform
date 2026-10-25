import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 상품담기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 담은줄정리 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-121',
  name: '다른 화면에서 돌아오면 「장바구니 {N}」 숫자를 새로 가져와 하나 늘어 있다',
  platforms: ['android'],
  precondition: ['담을 상품이 장바구니에 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z
      .string()
      .describe('담을 상품 이름 — 옵션이 없고 품절이 아닌 상품')
      .default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  let 담았나 = false;
  let 앞수 = 0;

  try {
    await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
    });

    await test.step('지난 실행이 남긴 줄을 장바구니에서 지운다', async () => {
      await 장바구니줄지우기(driver, params.product);
    });

    await test.step('담을 상품이 장바구니에 없는지 확인한다', async () => {
      const 장바구니 = await 장바구니열기(driver);
      await verify('담을 상품이 장바구니에 없다', (await 장바구니.줄찾기(params.product)) === undefined, true, { blocker: true });
      const 줄수 = await 장바구니.줄수();
      await 목록으로돌아가기(driver);
      await 목록.장바구니수가될때까지(줄수).catch(() => undefined);
      앞수 = await 목록.장바구니수();
    });

    await test.step('상품 상세에서 장바구니에 담고 상품 목록으로 돌아온다', async () => {
      담았나 = true;
      await 상품담기(driver, params.product);
      await 목록.장바구니수가될때까지(앞수 + 1).catch(() => undefined);
      await verify('다른 화면에서 돌아오면 「장바구니 {N}」 숫자를 새로 가져와 하나 늘어 있다', (await 목록.장바구니수()) - 앞수, 1);
    });
  } finally {
    if (담았나) await 담은줄정리(driver, params.product);
  }
});
