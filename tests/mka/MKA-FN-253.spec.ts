import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 금액부분, 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-253',
  name: '쿠폰을 고르면 「쿠폰 할인」 금액이 「-0원」에서 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('주문할 상품 번호 — 10% 쿠폰을 쓸 수 있는 품절 아닌 상품').default(1),
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

  await test.step('「10% 할인 (최대 5,000원)」 쿠폰을 고른다', async () => {
    const 화면 = new 주문하기화면(driver);
    const 앞할인 = await 화면.금액글('~discount_amount');
    const 앞총액 = await 화면.금액글('~total_amount');
    await 화면.쿠폰고르기('RATE10');
    await 화면.찾기('~discount_amount');
    const 할인바뀜 = await 화면.금액바뀔때까지('~discount_amount', 앞할인);
    await 화면.찾기('~total_amount');
    const 총액바뀜 = await 화면.금액바뀔때까지('~total_amount', 앞총액);
    const 처음 = await verify('쿠폰 할인이 처음에 「-0원」이다', 금액부분(앞할인), '-0원');
    const 바뀜 = await verify('쿠폰을 고르면 「쿠폰 할인」 금액이 바뀐다', 할인바뀜, true);
    await verify('쿠폰을 고르면 「쿠폰 할인」 금액이 「-0원」에서 바뀐다', 처음 && 바뀜, true);
    await verify('쿠폰을 고르면 「최종 결제 금액」도 바로 바뀐다', 총액바뀜, true);
  });
});
