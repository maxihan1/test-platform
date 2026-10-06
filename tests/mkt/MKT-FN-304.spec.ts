import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니담기, 장바구니비우기, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-304',
  name: '체크한 상품 금액이 50,000원 이상이면 배송비가 「0원」이다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니에 50,000원 넘는 상품 한 줄이 있다',
    '장바구니에 12,900원 상품 한 줄이 있다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 50,000원 넘는 상품 한 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.모니터]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      const 줄들 = await 장바구니조회(page.request);
      await verify('장바구니에 50,000원 넘는 상품 한 줄이 있다', `${줄들.length}줄 · ${줄들.every((줄) => 줄.unitPrice * 줄.qty > 50000) ? '모두 50,000원 넘음' : '50,000원 이하가 있음'}`, '1줄 · 모두 50,000원 넘음', { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('체크한 상품 금액이 50,000원 이상이면 배송비가 「0원」이다', await 장바구니.요약배송비.innerText(), '0원');
    });

    await test.step('12,900원 상품만 든 장바구니 화면을 연다', async () => {
      await 장바구니비우기(page.request);
      await 장바구니담기(page.request, 상품번호.USB허브);
      const 줄들 = await 장바구니조회(page.request);
      await verify('장바구니에 12,900원 상품 한 줄이 있다', 줄들.map((줄) => `${줄.unitPrice * 줄.qty}`).join(', '), '12900', { blocker: true });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('체크한 상품 금액이 50,000원 미만이면 배송비가 「3,000원」이다', await 장바구니.요약배송비.innerText(), '3,000원');
      await verify('「37,100원 더 담으면 무료 배송」이 보인다', await 장바구니.무료배송안내.innerText(), '37,100원 더 담으면 무료 배송');
      await verify('「결제 예정 금액」이 「15,900원」이다', await 장바구니.요약결제예정금액.innerText(), '15,900원');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
