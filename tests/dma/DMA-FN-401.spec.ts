import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 목록으로돌아가기, 상품상세열기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 담은줄정리 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-401',
  name: '「장바구니 담기」를 빠르게 두 번 눌러도 장바구니에는 한 번만 담겨 수량이 1이다',
  platforms: ['android'],
  techniques: ['오류 추정'],
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
      await 목록으로돌아가기(driver);
    });

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」를 빠르게 두 번 누른다', async () => {
      담았나 = true;
      const 상세 = await 상품상세열기(driver, params.product);
      await Promise.all([상세.담기(), 상세.담기()]);
      const 토스트상자 = new 토스트(driver);
      await 토스트상자.뜰때까지();
      await 토스트상자.사라질때까지();
      await 목록으로돌아가기(driver);
      const 장바구니 = await 장바구니열기(driver);
      const 줄 = await 장바구니.줄꼭찾기(params.product);
      await verify('「장바구니 담기」를 빠르게 두 번 눌러도 장바구니에는 한 번만 담겨 수량이 1이다', await 장바구니.줄수량(줄), 1);
    });
  } finally {
    if (담았나) await 담은줄정리(driver, params.product);
  }
});
