import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 목록으로돌아가기, 상품상세열기 } from './helpers/cart.helper.js';
import { 장바구니숫자읽기 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-162',
  name: '옵션을 고르지 않고 「장바구니 담기」를 누르면 토스트 「옵션을 선택하세요」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['옵션 있는 상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    optionProduct: z
      .string()
      .describe('옵션 있는 상품 이름 — 색상 · 사이즈 칩이 있고 품절이 아닌 상품')
      .default('데모 니트 가디건'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 토스트상자 = new 토스트(driver);
  let 앞수 = 0;

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 옵션 있는 상품 상세를 연다', async () => {
    앞수 = await 장바구니숫자읽기(driver);
    await 상품상세열기(driver, params.optionProduct);
    await verify('옵션 있는 상품 상세 화면이 보인다', await 상세.옵션있나(), true, { blocker: true });
  });

  await test.step('옵션을 고르지 않고 「장바구니 담기」를 누른다', async () => {
    await 상세.담기();
    await verify('옵션을 고르지 않고 「장바구니 담기」를 누르면 토스트 「옵션을 선택하세요」가 보인다', await 토스트글읽기(driver), '옵션을 선택하세요');
    await 토스트상자.사라질때까지();
  });

  await test.step('상품 목록으로 돌아가 「장바구니 {N}」 숫자를 확인한다', async () => {
    await 목록으로돌아가기(driver);
    await verify('옵션 없이 누른 「장바구니 담기」는 담지 않아 「장바구니 {N}」 숫자가 그대로다', await 목록.장바구니수(), 앞수);
  });

  await test.step('색상만 고르고 「바로 구매」를 누른다', async () => {
    await 상품상세열기(driver, params.optionProduct);
    await 상세.칩누르기('색상');
    await 상세.바로구매();
    await verify('사이즈를 고르지 않고 「바로 구매」를 누르면 토스트 「옵션을 선택하세요」가 보인다', await 토스트글읽기(driver), '옵션을 선택하세요');
  });

  await test.step('상품 상세 화면에 머무는지 확인한다', async () => {
    const 머묾 = await verify('상품 상세에 머문다', await 상세.보이나(), true);
    const 안넘어감 = await verify('주문하기로 넘어가지 않는다', await new 주문하기화면(driver).보이나(), false);
    await verify('사이즈 없이 누른 「바로 구매」는 주문하기로 넘어가지 않고 상품 상세에 머문다', 머묾 && 안넘어감, true);
  });
});
