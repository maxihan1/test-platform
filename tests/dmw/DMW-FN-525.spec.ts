import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 가짜줄, 시험배송정보, 장바구니목록가짜로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-525',
  name: '결제 금액이 49,999원이면 할부 「3개월」을 고를 수 없다',
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
  let 풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 46999 })]);

  try {
    await test.step('결제 금액 49,999원 주문서에서 「신용카드」를 고른다', async () => {
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.결제수단고르기('신용카드');
      await verify('결제 금액이 49,999원이다', await 주문서.결제금액미리보기숫자(), 49999, { blocker: true });
      await verify('결제 금액이 49,999원이면 할부 「3개월」을 고를 수 없다', await 주문서.할부선택지가막혔는가('3개월'), true);
    });
    await test.step('결제 금액 50,000원 주문서에서 「신용카드」를 고른다', async () => {
      await 풀기();
      풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ id: 9001, unitPrice: 47000 })]);
      await 주문서.열기([9001]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.결제수단고르기('신용카드');
      await verify('결제 금액이 50,000원이다', await 주문서.결제금액미리보기숫자(), 50000, { blocker: true });
      await verify('결제 금액이 50,000원이면 할부 「3개월」을 고를 수 있다', await 주문서.할부선택지가막혔는가('3개월'), false);
    });
  } finally {
    await 풀기();
  }
});
