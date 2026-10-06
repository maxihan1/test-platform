import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-531',
  name: '요청 사항 직접 입력 칸에 51자를 적으면 50자까지만 들어간다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
  unconfirmed:
    '기획서와 다름 — 차이 D13: 요청 사항 직접 입력 칸 50자 제한이 기획서에 없다 (작성 요청 5873)',
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

    await test.step('주문서를 연다', async () => {
      const 줄들 = await 장바구니조회(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 주문서.열기(줄들.map((줄) => 줄.id));
      await verify('주문서 「① 배송 정보」 단계가 열려 있다', await 주문서.현재단계이름(), '① 배송 정보', { blocker: true });
    });

    await test.step('「직접 입력」 칸에 51자를 적는다', async () => {
      await 주문서.배송요청상자.selectOption({ label: '직접 입력' });
      await 주문서.요청직접입력칸.fill('가'.repeat(51));
      await verify('요청 사항 직접 입력 칸에 51자를 적으면 50자까지만 들어간다', await 주문서.요청직접입력칸.inputValue(), '가'.repeat(50));
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
