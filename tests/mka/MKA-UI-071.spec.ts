import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-071',
  name: '주문하기 주소 줄에 처음 「주소를 검색하세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 품절이 아닌 상품').default(1),
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

  await test.step('주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    const 화면 = new 주문하기화면(driver);
    await verify('주문하기 주소 줄에 처음 「주소를 검색하세요」가 보인다', await 화면.주소글(), '주소를 검색하세요');
    await verify('주소 줄 옆에 「주소 검색」 버튼이 보인다', await 화면.주소검색버튼글읽기(), '주소 검색');
  });
});
