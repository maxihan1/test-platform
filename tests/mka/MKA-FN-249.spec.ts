import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 금액부분, 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-249',
  name: '최소 주문 금액에 못 미치는 쿠폰은 흐리게 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['판매가 30,000원 미만 상품으로 주문하기를 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 판매가가 30,000원 미만인 품절 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 상품명 = '';
  let 판매가 = 0;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
    const 상품 = await 상품읽기(request, params.상품번호);
    상품명 = 상품.name;
    판매가 = 상품.salePrice;
    const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상품 목록이 보인다', 열림, true, { blocker: true });
  });

  await test.step('상품 상세에서 「바로 구매」를 눌러 주문하기를 연다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    await verify('상품 판매가가 30,000원 미만이다', 판매가 < 30000, true, { blocker: true });
  });

  await test.step('「3,000원 할인 (30,000원 이상 구매 시)」 쿠폰을 누른다', async () => {
    const 화면 = new 주문하기화면(driver);
    await verify('최소 주문 금액에 못 미치는 쿠폰은 흐리게 보인다', await 화면.쿠폰눌리나('FLAT3000'), false);
    await 화면.쿠폰고르기('FLAT3000');
    await verify('최소 주문 금액에 못 미치는 쿠폰을 눌러도 「쿠폰 할인」이 「-0원」 그대로다', 금액부분(await 화면.금액글('~discount_amount')), '-0원');
  });
});
