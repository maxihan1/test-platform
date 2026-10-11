import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-235',
  name: '빈 장바구니 화면에 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('빈 장바구니를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오기끝나기를기다리기();
      await verify('빈 장바구니 화면에 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', [await 장바구니.빈문구.isVisible(), await 장바구니.쇼핑하러가기.isVisible()], [true, true]);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
