import { defineCase, test, verify } from '@platform/kit';

import type { 임시회원 } from './components/account.component.js';
import { 상품번호, 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 추가상품번호, 회원과장바구니, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-309',
  name: '체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니에 상품 두 줄이 있다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 장바구니에 상품 두 줄을 담는다', async () => {
      const 회원 = await 회원과장바구니(page.request, [상품번호.니트가디건, 추가상품번호.캐시미어머플러]);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니에 상품 두 줄이 있다', (await 장바구니조회(page.request)).length, 2, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.줄들.nth(1).waitFor();
      await verify('장바구니에 상품 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    await test.step('장바구니 「전체 선택」을 끈다', async () => {
      await 장바구니.전체선택.uncheck();
      await verify('체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다', await 장바구니.주문하기.isDisabled(), true);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
