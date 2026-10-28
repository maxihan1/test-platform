import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결과줄뜰때까지, 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주소검색창 } from './pages/address-search.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-257',
  name: '주소 검색 결과가 0건이면 안내 문구가 보이고 1건 이상이면 결과 줄이 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주소 검색 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    없는검색어: z.string().describe('결과가 0건인 주소 검색어 — 2자 이상이고 결과가 없는 글').default('없는주소쀍쀍'),
    있는검색어: z.string().describe('결과가 1건 이상인 주소 검색어 — 2자 이상의 도로명이나 지역').default('테헤란로'),
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

  await test.step('결과가 0건인 검색어 「없는주소쀍쀍」으로 검색한다', async () => {
    await 창.주소찾기(params.없는검색어);
    await 창.결과나올때까지();
    await verify(
      '주소 검색 결과가 0건이면 「검색 결과가 없습니다」가 보인다',
      (await 창.결과없음보이나()) ? await 창.결과없음글() : '',
      '검색 결과가 없습니다',
    );
  });

  await test.step('결과가 1건 이상인 검색어 「테헤란로」로 검색한다', async () => {
    await 창.주소찾기(params.있는검색어);
    await 결과줄뜰때까지(driver).catch(() => undefined);
    const 안내없음 = await verify('「검색 결과가 없습니다」가 보이지 않는다', !(await 창.결과없음보이나()), true);
    const 줄있음 = await verify('결과 줄이 보인다', (await 창.결과줄글들()).length >= 1, true);
    await verify(
      '주소 검색 결과가 1건 이상이면 「검색 결과가 없습니다」 없이 결과 줄이 보인다',
      안내없음 && 줄있음,
      true,
    );
  }, { capture: true });
});
