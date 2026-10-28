import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기, 주소부분, 주소줄이채워질때까지, 첫결과누르기 } from './helpers/checkout-flow.helper.js';
import { 주소검색창 } from './pages/address-search.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-253',
  name: '주소 검색 결과 줄을 누르면 그 주소가 들어가고 주소 검색 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주소 검색 결과 줄이 보인다'],
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

  await test.step('일반 회원 계정으로 로그인해 주소를 검색한다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.주소검색열기();
    await 창.주소찾기(params.검색어);
    await 창.결과나올때까지();
  });

  await test.step('주소 검색 결과 줄을 확인한다', async () => {
    await verify('주소 검색 결과 줄이 보인다', (await 창.결과줄글들()).length >= 1, true, { blocker: true });
  });

  await test.step('결과 줄을 누른다', async () => {
    const 누른줄 = await 첫결과누르기(driver);
    await 창.닫힐때까지().catch(() => undefined);
    await 주소줄이채워질때까지(driver, 주문하기).catch(() => undefined);
    await verify(
      '결과 줄을 누르면 그 주소가 주소 줄에 들어간다',
      (await 주문하기.주소줄글()).includes(주소부분(누른줄)),
      true,
    );
    await verify('결과 줄을 누르면 주소 검색 창이 닫힌다', !(await 창.보이나()), true);
  }, { capture: true });
});
