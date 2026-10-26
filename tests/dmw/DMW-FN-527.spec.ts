import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 가짜줄, 시험배송정보, 장바구니목록가짜로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-527',
  name: '상품 금액이 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다', '장바구니 목록은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  let 풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 29999 })]);

  try {
    await test.step('상품 금액 29,999원 주문서에서 쿠폰을 고른다', async () => {
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await verify('결제 금액이 32,999원이다', await 주문서.결제금액미리보기숫자(), 32999, { blocker: true });
      await verify('상품 금액이 29,999원이면 「3,000원 할인」 쿠폰을 고를 수 없다', await 주문서.쿠폰선택지가막혔는가('3,000원 할인 (30,000원 이상 구매 시)'), true);
    });
    await test.step('상품 금액 30,000원 주문서에서 「3,000원 할인」 쿠폰을 고른다', async () => {
      await 풀기();
      풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 30000 })]);
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await verify('결제 금액이 33,000원이다', await 주문서.결제금액미리보기숫자(), 33000, { blocker: true });
      await verify('상품 금액이 30,000원이면 「3,000원 할인」 쿠폰을 고를 수 있다', await 주문서.쿠폰선택지가막혔는가('3,000원 할인 (30,000원 이상 구매 시)'), false);
    });
    await test.step('상품 금액 50,000원 주문서에서 「10% 할인」 쿠폰을 고른다', async () => {
      await 풀기();
      풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 50000 })]);
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await verify('결제 금액이 50,000원이다', await 주문서.결제금액미리보기숫자(), 50000, { blocker: true });
      await 주문서.쿠폰고르기('10% 할인 (최대 5,000원)');
      await verify('상품 금액이 50,000원이면 「10% 할인」은 5,000원 할인이다', await 주문서.결제금액미리보기숫자(), 50000 - 5000);
    });
    await test.step('상품 금액 50,010원 주문서에서 「10% 할인」 쿠폰을 고른다', async () => {
      await 풀기();
      풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 50010 })]);
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await verify('결제 금액이 50,010원이다', await 주문서.결제금액미리보기숫자(), 50010, { blocker: true });
      await 주문서.쿠폰고르기('10% 할인 (최대 5,000원)');
      await verify('상품 금액이 50,010원이어도 「10% 할인」은 5,000원을 넘게 깎지 않는다', await 주문서.결제금액미리보기숫자(), 50010 - 5000);
    });
  } finally {
    await 풀기();
  }
});
