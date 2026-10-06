import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 장바구니조회 } from './components/data.component.js';
import { 로그인한아이디, 회원정리 } from './components/shop-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-104',
  name: '빈 장바구니 화면에 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니가 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인한다', async () => {
      const 회원 = await 임시회원로그인(page.request);
      내것.회원 = 회원;
      await verify('새로 만든 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
      await verify('장바구니가 비어 있다', (await 장바구니조회(page.request)).length, 0, { blocker: true });
    });

    await test.step('빈 장바구니 화면을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 장바구니.열기();
      await 장바구니.빈문구.waitFor();
      await verify('빈 장바구니 화면에 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', [await 장바구니.빈문구.isVisible(), await 장바구니.쇼핑하러가기.isVisible()], [true, true]);
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
