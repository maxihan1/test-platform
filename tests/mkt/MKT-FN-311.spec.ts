import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-311',
  name: '장바구니에 상품이 1개 있으면 「장바구니가 비어 있습니다」가 보이지 않는다',
  held: '보류 — 검증 실패: 마지막 상품을 지워 0개가 되면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다 (「확인」 뒤 화면 스크립트 오류로 삭제 요청이 나가지 않는다 · 차이 D29)',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 확인창 = new 모달(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('상품이 1개 든 장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 상품이 1개 있으면 「장바구니가 비어 있습니다」가 보이지 않는다', await 장바구니.빈문구.isVisible(), false);
    });

    await test.step('그 한 줄을 「선택 삭제」로 지운다', async () => {
      const 상품 = await 상품조회(page.request, 상품번호.USB허브);
      await 장바구니.선택삭제누르기();
      await 확인창.열림기다리기();
      await 확인창.버튼('확인').click();
      await 확인창.닫힘기다리기();
      await 장바구니.줄이사라지기를기다리기(상품.name);
      await verify('마지막 상품을 지워 0개가 되면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', [await 장바구니.빈문구.isVisible(), await 장바구니.쇼핑하러가기.isVisible()], [true, true]);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
