import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 가짜줄, 시험배송정보, 장바구니목록가짜로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-529',
  name: '최종 결제 금액은 상품 금액에서 쿠폰 할인을 빼고 배송비를 더한 값이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '장바구니 목록은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  let 풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 52000 })]);

  try {
    await test.step('상품 금액 52,000원에 「10% 할인」 쿠폰을 고르고 ③ 최종 확인까지 간다', async () => {
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.쿠폰고르기('10% 할인 (최대 5,000원)');
      await 주문서.최종확인으로넘어가기('계좌이체');
      await verify('「③ 최종 확인」이 보인다', await 주문서.단계글(), '③ 최종 확인', { blocker: true });
      await verify('상품 금액이 52,000원이다', await 주문서.항목금액읽기('상품 금액'), 52000, { blocker: true });
      const 최종 = await 주문서.항목금액읽기('최종 결제 금액');
      const 계산 = (await 주문서.항목금액읽기('상품 금액')) - (await 주문서.항목금액읽기('쿠폰 할인')) + (await 주문서.항목금액읽기('배송비'));
      await verify('최종 결제 금액은 상품 금액에서 쿠폰 할인을 빼고 배송비를 더한 값이다', 최종, 계산);
    });
    await test.step('쿠폰 적용 뒤 배송비를 확인한다', async () => {
      await verify('상품 금액 52,000원에서 쿠폰으로 50,000원 아래가 되어도 배송비는 0원이다', await 주문서.항목금액읽기('배송비'), 0);
    });
  } finally {
    await 풀기();
  }
});
