import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-224',
  name: '주소 검색 결과가 0건이면 「검색 결과가 없습니다」가 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
    결과없는검색어: z.string().describe('결과가 0건인 주소 검색어 — 2자 이상').default('없는주소가나다'),
    결과하나검색어: z.string().describe('결과가 1건인 주소 검색어 — 2자 이상').default('테헤란'),
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

  await test.step('주문하기에서 주소 검색 창을 연다', async () => {
    await verify('주소 검색 창이 보인다', await new 주문하기화면(driver).주소검색창열기(), true, { blocker: true });
  });

  await test.step('「없는주소가나다」로 검색한다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.주소검색하기(params.결과없는검색어);
    await 화면.결과나올때까지();
    await verify('주소 검색 결과가 0건이면 「검색 결과가 없습니다」가 보인다', await 화면.결과없음글(), '검색 결과가 없습니다');
  });

  await test.step('「테헤란」으로 검색한다', async () => {
    const 화면 = new 주문하기화면(driver);
    await 화면.주소검색하기(params.결과하나검색어);
    await 화면.결과줄뜰때까지();
    await verify('주소 검색 결과가 1건이면 「검색 결과가 없습니다」가 보이지 않는다', await 화면.결과없음보이나(), false);
  });
});
