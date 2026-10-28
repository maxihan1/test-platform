import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 상품담기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-196',
  name: '확인 창에서 「삭제」를 누르면 체크한 줄이 장바구니에서 지워진다',
  platforms: ['android'],
  precondition: ['담을 상품이 장바구니에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z.string().describe('담을 상품 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
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

    await test.step('담을 상품을 장바구니에 담는다', async () => {
      담았나 = true;
      await 장바구니줄지우기(driver, params.product);
      await 상품담기(driver, params.product);
    });

    await test.step('장바구니에 담긴 상품 줄을 확인한다', async () => {
      await 장바구니열기(driver);
      await verify('담을 상품이 장바구니에 있다', (await 장바구니.줄찾기(params.product)) !== undefined, true, { blocker: true });
    });

    await test.step('그 줄만 체크하고 「선택 삭제」를 누른 뒤 「삭제」를 누른다', async () => {
      await 장바구니.한줄만체크(params.product);
      await 장바구니.선택삭제누르기();
      await 장바구니.확인창뜰때까지();
      await 장바구니.확인창삭제누르기();
      await 될때까지기다려보기(driver, async () => (await 장바구니.줄찾기(params.product)) === undefined, 15000);
      await verify(
        '확인 창에서 「삭제」를 누르면 체크한 줄이 장바구니에서 지워진다',
        (await 장바구니.줄찾기(params.product)) === undefined,
        true,
      );
    }, { capture: true });
  } finally {
    if (담았나) {
      await 목록으로돌아가기(driver);
      await 장바구니줄지우기(driver, params.product);
    }
  }
});
