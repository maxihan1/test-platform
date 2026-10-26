import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 새주문모두취소, 시험배송정보 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-271',
  name: '결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴의 주문번호가 보인다',
  platforms: ['desktop', 'mobile'],
  smoke: true,
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);
  let 최종금액 = 0;

  try {
    await test.step('주문서 세 단계를 마치고 결제한다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기(시험배송정보());
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.최종확인으로넘어가기('계좌이체');
      await verify('「③ 최종 확인」이 보인다', await 주문서.단계글(), '③ 최종 확인', { blocker: true });
      await 주문서.동의.check();
      최종금액 = await 주문서.항목금액읽기('최종 결제 금액');
      await 주문서.결제하기.click();
      await 완료.다그려질때까지();
      await verify('결제하면 주문 완료 화면에 「DM」 + 날짜 8자리 + 「-」 + 숫자 4자리 꼴의 주문번호가 보인다', /^DM\d{8}-\d{4}$/.test(await 완료.주문번호글()), true);
    });
    await test.step('주문 완료 화면의 결제 금액을 확인한다', async () => {
      await verify('결제하면 주문 완료 화면에 최종 확인의 결제 금액이 보인다', await 완료.결제금액읽기(), 최종금액);
    });
    await test.step('주문 완료 화면의 버튼을 확인한다', async () => {
      const 내역 = await verify('「주문 내역 보기」 버튼이 보인다', await 완료.주문내역보기.isVisible(), true);
      const 쇼핑 = await verify('「쇼핑 계속하기」 버튼이 보인다', await 완료.쇼핑계속하기.isVisible(), true);
      await verify('결제하면 주문 완료 화면에 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다', 내역 && 쇼핑, true);
    });
  } finally {
    await 새주문모두취소(page.request);
    await 장바구니비우기(page.request);
  }
});
