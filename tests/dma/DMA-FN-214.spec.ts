import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 목록으로돌아가기, 상품담기, 장바구니열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 금액글 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기, 보이는글 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-214',
  name: '배송비가 붙으면 「{모자란 금액} 더 담으면 무료 배송」이 보인다',
  platforms: ['android'],
  precondition: ['체크한 줄의 상품 금액이 50,000원보다 적다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z.string().describe('담을 상품 — 옵션이 없고 50,000원보다 싼 품절 아닌 상품').default('USB-C 허브'),
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

    await test.step('50,000원보다 적은 상품을 장바구니에 담는다', async () => {
      담았나 = true;
      await 장바구니줄지우기(driver, params.product);
      await 상품담기(driver, params.product);
    });

    await test.step('담은 줄만 체크해 상품 금액을 확인한다', async () => {
      await 장바구니열기(driver);
      const 앞금액 = await 장바구니.상품금액값();
      await 장바구니.한줄만체크(params.product);
      await 될때까지기다려보기(driver, async () => (await 장바구니.상품금액값()) !== 앞금액);
      await verify('체크한 줄의 상품 금액이 50,000원보다 적다', (await 장바구니.상품금액값()) < 50000, true, { blocker: true });
    });

    await test.step('무료 배송 안내를 확인한다', async () => {
      const 안내 = await 보이는글(await 장바구니.무료배송안내.getElement());
      const 모자란금액 = 50000 - (await 장바구니.상품금액값());
      await verify('배송비가 붙으면 「{모자란 금액} 더 담으면 무료 배송」이 보인다', 안내, `${금액글(모자란금액)} 더 담으면 무료 배송`);
    }, { capture: true });
  } finally {
    if (담았나) {
      await 목록으로돌아가기(driver);
      await 장바구니줄지우기(driver, params.product);
    }
  }
});
