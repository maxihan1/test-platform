import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 보이는글 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-UI-069',
  name: '장바구니 아래에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 있다'],
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
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
  });

  await test.step('장바구니 아래를 확인한다', async () => {
    const 상품금액글 = await 보이는글(await 장바구니.상품금액.getElement());
    const 배송비글 = await 보이는글(await 장바구니.배송비.getElement());
    const 결제예정글 = await 보이는글(await 장바구니.결제예정금액.getElement());
    const 상품금액 = await verify('「상품 금액」이 보인다', 상품금액글.includes('상품 금액'), true);
    const 배송비 = await verify('「배송비」가 보인다', 배송비글.includes('배송비'), true);
    const 결제예정 = await verify('「결제 예정 금액」이 보인다', 결제예정글.includes('결제 예정 금액'), true);
    await verify(
      '장바구니 아래에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다',
      상품금액 && 배송비 && 결제예정,
      true,
    );
  }, { capture: true });
});
