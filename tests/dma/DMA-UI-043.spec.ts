import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 분류들, 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-043',
  name: '상품 상세에 분류 · 상품명 · 판매가 · 요약 · 설명이 보인다',
  platforms: ['android'],
  precondition: ['상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    product: z
      .string()
      .describe('옵션 없는 상품 이름 — 옵션이 없고 품절이 아닌 상품')
      .default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.product);
    await verify('상품 상세 화면이 보인다', await 상세.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세 내용을 확인한다', async () => {
    const 분류글 = await 상세.분류글();
    const 분류 = await verify('분류가 보인다', 분류들.some((이름) => 이름 !== '전체' && 이름 === 분류글), true);
    const 이름 = await verify('상품명이 보인다', await 상세.상품명.isDisplayed(), true);
    const 가격 = await verify('판매가가 보인다', /^\d{1,3}(,\d{3})*원$/.test(await 상세.판매가글()), true);
    const 요약 = await verify('요약이 보인다', (await 상세.요약글()) !== '', true);
    const 설명 = await verify('설명이 보인다', (await 상세.설명.getText()) !== '', true);
    await verify('상품 상세에 분류 · 상품명 · 판매가 · 요약 · 설명이 보인다', 분류 && 이름 && 가격 && 요약 && 설명, true);
  });
});
