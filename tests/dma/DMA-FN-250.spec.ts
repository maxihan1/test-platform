import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주소검색창 } from './pages/address-search.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-250',
  name: '주소 검색 창에서 검색하면 「[{우편번호}] {주소}」 꼴의 결과 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주소 검색 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    검색어: z.string().describe('주소 검색어 — 결과가 1건 이상인 2자 이상의 도로명이나 지역').default('테헤란로'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 창 = new 주소검색창(driver);

  await test.step('일반 회원 계정으로 로그인해 주소 검색 창을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.주소검색열기();
  });

  await test.step('주소 검색 창을 확인한다', async () => {
    await verify('주소 검색 창이 떠 있다', await 창.보이나(), true, { blocker: true });
  });

  await test.step('「도로명 · 지역」 칸에 「테헤란로」를 적고 「검색」을 누른다', async () => {
    await 창.주소찾기(params.검색어);
    await 창.결과나올때까지();
    const 줄들 = await 창.결과줄글들();
    await verify(
      '주소 검색 창에서 검색하면 「[{우편번호}] {주소}」 꼴의 결과 줄이 보인다',
      /^\[\d{5}\] .+$/.test(줄들[0] ?? ''),
      true,
    );
  }, { capture: true });
});
