import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 로그인한아이디, 회원정리, 장바구니응답걸기, 장바구니응답풀기 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-535',
  name: '결제 금액이 49,999원이면 할부 「3개월」 · 「6개월」을 고를 수 없다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니 응답은 가짜 응답(모킹)이다 — 결제 금액 49,999원',
    '배송 정보는 맞게 채웠다',
    '장바구니 응답은 가짜 응답(모킹)이다 — 결제 금액 50,000원',
  ],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
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

    await test.step('결제 금액이 49,999원인 주문서에서 「신용카드」를 고른다', async () => {
      await 장바구니응답풀기(page);
      await 장바구니응답걸기(page, 46999);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기([990001]);
      await 주문서.배송정보채우기();
      await verify('배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 연락처, 우편번호, 주소, 상세 주소, 배송 희망일', { blocker: true });
      await 주문서.다음버튼.click();
      await 주문서.결제수단('신용카드').waitFor();
      await 주문서.결제단계준비기다리기();
      await verify('결제 금액이 49,999원이다', await 주문서.결제금액(), 49999, { blocker: true });
      await 주문서.결제수단('신용카드').check();
      await verify('결제 금액이 49,999원이면 할부 「3개월」 · 「6개월」을 고를 수 없다', [await 주문서.할부옵션('3개월').isDisabled(), await 주문서.할부옵션('6개월').isDisabled()], [true, true]);
    });

    await test.step('결제 금액이 50,000원인 주문서에서 「신용카드」를 고른다', async () => {
      await 장바구니응답풀기(page);
      await 장바구니응답걸기(page, 47000);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기([990001]);
      await 주문서.배송정보채우기();
      await verify('배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 연락처, 우편번호, 주소, 상세 주소, 배송 희망일', { blocker: true });
      await 주문서.다음버튼.click();
      await 주문서.결제수단('신용카드').waitFor();
      await 주문서.결제단계준비기다리기();
      await verify('결제 금액이 50,000원이다', await 주문서.결제금액(), 50000, { blocker: true });
      await 주문서.결제수단('신용카드').check();
      await verify('결제 금액이 50,000원이면 할부 「3개월」 · 「6개월」을 고를 수 있다', [await 주문서.할부옵션('3개월').isDisabled(), await 주문서.할부옵션('6개월').isDisabled()], [false, false]);
    });

  } finally {
    await 장바구니응답풀기(page);
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
