import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 로그인한아이디, 장바구니응답걸기, 장바구니응답풀기, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-530',
  name: '상품 금액이 49,999원이면 배송비가 「3,000원」이고 「1원 더 담으면 무료 배송」이 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 만든 회원으로 로그인해 있다',
    '장바구니 응답은 가짜 응답(모킹)이다 — 상품 금액 49,999원',
    '장바구니 응답은 가짜 응답(모킹)이다 — 상품 금액 50,000원',
  ],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      const 회원 = await 임시회원로그인(page.request);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
    });

    await test.step('상품 금액이 49,999원인 장바구니 화면을 연다', async () => {
      await 장바구니응답걸기(page, 49999);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('상품 금액이 49,999원이다', await 장바구니.요약상품금액.innerText(), '49,999원', { blocker: true });
      await verify(
        '상품 금액이 49,999원이면 배송비가 「3,000원」이고 「1원 더 담으면 무료 배송」이 보인다',
        `${await 장바구니.요약배송비.innerText()} · ${(await 장바구니.무료배송안내.isVisible()) ? await 장바구니.무료배송안내.innerText() : '안내 없음'}`,
        '3,000원 · 1원 더 담으면 무료 배송',
      );
    });

    await test.step('상품 금액이 50,000원인 장바구니 화면을 연다', async () => {
      await 장바구니응답풀기(page);
      await 장바구니응답걸기(page, 50000);
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('상품 금액이 50,000원이다', await 장바구니.요약상품금액.innerText(), '50,000원', { blocker: true });
      await verify(
        '상품 금액이 50,000원이면 배송비가 「0원」이고 무료 배송 안내가 보이지 않는다',
        `${await 장바구니.요약배송비.innerText()} · 안내 ${(await 장바구니.무료배송안내.isVisible()) ? '있음' : '없음'}`,
        '0원 · 안내 없음',
      );
    });
  } finally {
    await 장바구니응답풀기(page);
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
