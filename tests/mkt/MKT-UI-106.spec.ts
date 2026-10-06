import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-106',
  name: '주문서 배송 정보에 받는 분 · 연락처 · 주소 · 상세 주소 · 배송 요청 사항 칸이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.USB허브]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 한 줄이 있다', (await 장바구니조회(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니에서 주문서를 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await 장바구니.주문하기.click();
      await 주문서.열릴때까지기다리기();
      await verify('주문서 배송 정보에 받는 분 · 연락처 · 주소 · 상세 주소 · 배송 요청 사항 칸이 보인다', (await 주문서.배송정보칸이름들()).join(', '), '받는 분, 연락처, 주소, 상세 주소, 배송 요청 사항');
      const 있는것 = (await 주문서.배송요청목록()).filter((글) => ['문 앞에 놓아 주세요', '경비실에 맡겨 주세요', '직접 입력'].includes(글));
      await verify('배송 요청 사항에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」이 있다', 있는것.join(', '), '문 앞에 놓아 주세요, 경비실에 맡겨 주세요, 직접 입력');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
