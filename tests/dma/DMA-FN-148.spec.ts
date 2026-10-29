import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 상품상세열기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 담은줄정리 } from './helpers/product-flow.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-148',
  name: '「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다',
  platforms: ['android'],
  smoke: true,
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
  const 로그인창 = new 로그인화면(driver);
  let 담았나 = false;

  try {
    await test.step('일반 회원 계정으로 로그인한다', async () => {
      await 로그인창.열릴때까지();
      await 로그인창.로그인(params.loginId ?? '', params.loginPassword ?? '');
      await 목록.열릴때까지();
    });

    await test.step('상품 목록을 확인한다', async () => {
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

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」를 누른다', async () => {
      담았나 = true;
      const 상세 = await 상품상세열기(driver, params.product);
      await 상세.담기();
      await verify('「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다', await 토스트글읽기(driver), '장바구니에 담았습니다');
    });
  } finally {
    if (담았나) await 담은줄정리(driver, params.product);
  }
});
