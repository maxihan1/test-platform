import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면글들 } from './helpers/app.helper.js';
import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-154',
  name: '「바로 구매」를 누르면 그 상품 한 줄로 주문하기 화면이 열린다',
  platforms: ['android'],
  smoke: true,
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
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 옵션 있는 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.optionProduct);
    await verify('옵션 있는 상품 상세 화면이 보인다', await 상세.옵션있나(), true, { blocker: true });
  });

  await test.step('옵션을 고르고 「바로 구매」를 누른다', async () => {
    await 상세.옵션다고르기();
    await 상세.바로구매();
    await 주문하기.열릴때까지().catch(() => undefined);
    const 열림 = await verify('주문하기 화면이 열린다', await 주문하기.보이나(), true);
    const 한줄 = await verify('주문 상품이 한 줄이다', (await 주문하기.주문상품줄글들()).length, 1);
    const 그상품 = await verify('주문 상품에 그 상품이 보인다', (await 화면글들(driver)).some((글) => 글.includes(params.optionProduct)), true);
    await verify('「바로 구매」를 누르면 그 상품 한 줄로 주문하기 화면이 열린다', 열림 && 한줄 && 그상품, true);
  });
});
