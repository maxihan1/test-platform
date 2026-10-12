import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션없는상품, 원 } from './helpers/shop-tools.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-164',
  name: '장바구니 수량을 늘리면 줄 금액과 「상품 금액」 합계가 바로 바뀐다',
  precondition: ['장바구니에 상품 한 줄이 담긴 회원으로 로그인해 있다'],
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

    await test.step('장바구니에 상품 한 줄을 담는다', async () => {
      const 상품 = await 옵션없는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1 });
    });

    await test.step('장바구니에 상품 한 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 한 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니 화면을 준비한다', async () => {
      await 장바구니.열기();
    });

    await test.step('장바구니 화면이 떴는지 확인한다', async () => {
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 상품 줄 한 줄이 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
    });

    await test.step('그 줄의 「+」를 누른다', async () => {
      const 줄API = (await 장바구니보기(page.request))[0];
      const 줄 = 장바구니.줄(줄API?.name ?? '');
      const 금액전 = await 장바구니.금액숫자(장바구니.줄금액(줄));
      await 장바구니.줄늘리기(줄).click();
      await 장바구니.줄금액(줄).filter({ hasNotText: 원(금액전) }).waitFor();
      await verify('장바구니 수량을 늘리면 줄 금액과 「상품 금액」 합계가 바로 바뀐다', [await 장바구니.금액숫자(장바구니.줄금액(줄)), await 장바구니.금액숫자(장바구니.요약상품금액)], [금액전 * 2, 금액전 * 2]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
