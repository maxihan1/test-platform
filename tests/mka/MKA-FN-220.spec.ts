import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-220',
  name: '검색 결과 줄을 누르면 주소 줄에 그 주소가 들어간다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
    주소검색어: z.string().describe('주소 검색어 — 결과가 나오는 도로명이나 지역, 2자 이상').default('테헤란'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 상품명 = '';

  await test.step('일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
    상품명 = (await 상품읽기(request, params.상품번호)).name;
    const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상품 목록이 보인다', 열림, true, { blocker: true });
  });

  await test.step('상품 상세에서 「바로 구매」를 눌러 주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
  });

  await test.step('주소 검색 창에서 검색어로 검색한다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.주소검색창열기();
    await 화면.주소검색하기(params.주소검색어);
    await verify('검색 결과 줄이 보인다', await 화면.결과줄뜰때까지(), true, { blocker: true });
  });

  await test.step('주소 검색 결과 줄을 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    const 누른주소 = (await 화면.결과줄글()).replace(/^\[\d+\]\s*/, '');
    await 화면.결과줄누르기();
    const 닫힘 = await 화면.주소검색창닫혔나();
    await verify('검색 결과 줄을 누르면 주소 줄에 그 주소가 들어간다', (await 화면.주소글()).includes(누른주소), true);
    await verify('검색 결과 줄을 누르면 주소 검색 창이 닫힌다', 닫힘, true);
  });
});
