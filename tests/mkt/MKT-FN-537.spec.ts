import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 로그인한아이디, 회원정리, 장바구니응답걸기, 장바구니응답풀기 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-537',
  name: '쿠폰을 빼면 50,000원 미만이 되어도 쿠폰 적용 전 상품 금액 기준이라 배송비가 「0원」이다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니 응답은 가짜 응답(모킹)이다 — 상품 금액 52,000원',
    '배송 정보는 맞게 채웠다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      const 회원 = await 임시회원로그인(page.request);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
    });

    await test.step('상품 금액 52,000원에 「10% 할인 (최대 5,000원)」을 고르고 「③ 최종 확인」으로 간다', async () => {
      await 장바구니응답풀기(page);
      await 장바구니응답걸기(page, 52000);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기([990001]);
      await 주문서.배송정보채우기();
      await verify('배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 연락처, 우편번호, 주소, 상세 주소, 배송 희망일', { blocker: true });
      await 주문서.다음버튼.click();
      await 주문서.결제수단('신용카드').waitFor();
      await 주문서.결제단계준비기다리기();
      await 주문서.쿠폰옵션('10% 할인 (최대 5,000원)').waitFor({ state: 'attached' });
      await 주문서.최종확인단계로가기('계좌이체', '10% 할인 (최대 5,000원)');
      await verify('쿠폰을 빼면 50,000원 미만이 되어도 쿠폰 적용 전 상품 금액 기준이라 배송비가 「0원」이다', (await 주문서.최종금액표())['배송비'], '0원');
    });

  } finally {
    await 장바구니응답풀기(page);
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
