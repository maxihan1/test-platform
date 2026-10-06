import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-331',
  name: '최종 확인 단계로 가면 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 12,900원 상품 한 줄이 있다',
    '배송 정보는 맞게 채웠다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 12,900원 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 12,900원 12,900원 상품 한 줄이 있다', (await 장바구니조회(page.request)).map((줄) => `${줄.unitPrice * 줄.qty}`).join(', '), '12900', { blocker: true });
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

    await test.step('「계좌이체」와 「10% 할인 (최대 5,000원)」을 고르고 「③ 최종 확인」으로 간다', async () => {
      await 주문서.쿠폰옵션('10% 할인 (최대 5,000원)').waitFor({ state: 'attached' });
      await 주문서.최종확인단계로가기('계좌이체', '10% 할인 (최대 5,000원)');
      const 이름들 = ['상품 목록', '배송 정보', '결제 수단', '결제 금액'];
      const 보임 = await Promise.all(이름들.map((이름) => 주문서.최종확인구역(이름).isVisible()));
      await verify('최종 확인 단계로 가면 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다', 이름들.filter((_, 순서) => 보임[순서]).join(', '), '상품 목록, 배송 정보, 결제 수단, 결제 금액');
      const 표 = await 주문서.최종금액표();
      await verify(
        '최종 결제 금액이 상품 금액 12,900원 − 쿠폰 할인 1,290원 + 배송비 3,000원 = 「14,610원」이다',
        `${표['상품 금액']} − ${(표['쿠폰 할인'] ?? '').replace('-', '')} + ${표['배송비']} = ${표['최종 결제 금액']}`,
        '12,900원 − 1,290원 + 3,000원 = 14,610원',
      );
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
