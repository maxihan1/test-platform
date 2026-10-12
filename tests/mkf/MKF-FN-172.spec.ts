import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-172',
  name: '장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  techniques: ['경계값 분석'],
  precondition: ['장바구니가 빈 회원으로 로그인해 있다', '장바구니에 상품 한 줄이 담긴 회원으로 로그인해 있다'],
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

    await test.step('장바구니가 비어 있는지 확인한다', async () => {
      await verify('장바구니가 비어 있다', (await 장바구니보기(page.request)).length, 0, { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오기끝나기를기다리기();
      await verify('장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', [await 장바구니.빈문구.isVisible(), await 장바구니.쇼핑하러가기.isVisible()], [true, true]);
      const 상품 = await 옵션없는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1 });
      await verify('장바구니에 상품 한 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 1, { blocker: true });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 한 줄이 있으면 빈 장바구니 안내 없이 그 줄이 보인다', [await 장바구니.빈문구.isVisible(), await 장바구니.줄들.count()], [false, 1]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
