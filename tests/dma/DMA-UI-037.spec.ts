import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 첫카드 } from './helpers/product-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-037',
  name: '상품 카드에 상품명 · 판매가 · 「★ {평점} ({리뷰 수})」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다', '할인 중인 상품이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    discountProduct: z
      .string()
      .describe('할인 중인 상품 이름 — 상품 목록 카드에 「{할인율}%」가 붙는 상품')
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

  await test.step('상품 카드를 확인한다', async () => {
    const 카드 = await 첫카드(driver);
    const 글 = await 목록.카드글들(카드);
    const 이름 = await verify('상품명이 보인다', (await 목록.카드상품이름(카드)) !== '', true);
    const 가격 = await verify('판매가가 보인다', 글.some((칸) => /^\d{1,3}(,\d{3})*원$/.test(칸)), true);
    const 평점 = await verify('「★ {평점} ({리뷰 수})」가 보인다', 글.some((칸) => /^★ \d+(\.\d+)? \(\d+\)$/.test(칸)), true);
    await verify('상품 카드에 상품명 · 판매가 · 「★ {평점} ({리뷰 수})」가 보인다', 이름 && 가격 && 평점, true);
  });

  await test.step('할인 중인 상품 카드를 확인한다', async () => {
    const 카드 = await 목록.상품카드찾기(params.discountProduct);
    const 글 = await 목록.카드글들(카드);
    await verify('할인 중인 상품 카드에는 「{할인율}%」가 보인다', 글.some((칸) => /\d+%/.test(칸)), true);
  });
});
