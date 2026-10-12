import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션있는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-196',
  name: '장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다',
  precondition: ['장바구니에 옵션 상품이 담긴 회원으로 로그인해 있다'],
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

    await test.step('장바구니에 옵션 상품을 담는다', async () => {
      const 상품 = await 옵션있는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1, color: 상품.colors?.[0], size: 상품.sizes?.[0] });
    });

    await test.step('장바구니에 옵션 상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 옵션 상품 한 줄이 담겨 있다', (await 장바구니보기(page.request)).map((줄) => 줄.color !== ''), [true], { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      const 줄API = (await 장바구니보기(page.request))[0];
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      const 줄 = 장바구니.줄(줄API?.name ?? '');
      const 옵션글 = (줄API?.color ?? '') + ' / ' + (줄API?.size ?? '');
      await verify('장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다', [await 장바구니.줄이미지(줄).isVisible(), await 장바구니.줄이름(줄).isVisible(), await 장바구니.줄옵션(줄, 옵션글).isVisible(), await 장바구니.줄수량(줄).isVisible(), await 장바구니.줄금액(줄).isVisible()], [true, true, true, true, true]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
