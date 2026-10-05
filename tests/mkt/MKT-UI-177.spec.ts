import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-177',
  name: '할부 옆에 「할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다」가 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 상품 한 줄이 있다',
    '배송 정보는 맞게 채웠다',
  ],
  params: null,
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D20: 할부 안내 문구가 기획서에 없다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('주문서 「② 결제 수단」 단계로 간다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await 주문서.배송정보채우기();
      await verify('배송 정보는 맞게 채웠다', (await 주문서.채워진칸이름들()).join(', '), '받는 분, 연락처, 우편번호, 주소, 상세 주소, 배송 희망일', { blocker: true });
      await 주문서.다음버튼.click();
      await 주문서.결제수단('신용카드').waitFor();
      await 주문서.결제단계준비기다리기();
      await verify('주문서 「② 결제 수단」 단계가 열려 있다', await 주문서.현재단계이름(), '② 결제 수단', { blocker: true });
    });

    await test.step('결제 수단에서 「신용카드」를 고른다', async () => {
      await 주문서.결제수단('신용카드').check();
      await verify('할부 옆에 「할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다」가 보인다', await 주문서.할부안내.isVisible(), true);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
