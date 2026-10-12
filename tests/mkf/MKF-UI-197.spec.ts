import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 두줄담기, 세션사용자 } from './helpers/shop-tools.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-197',
  name: '장바구니 줄 체크박스는 처음에 모두 켜져 있다',
  precondition: ['장바구니에 상품 두 줄이 담긴 회원으로 로그인해 있다'],
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

    await test.step('장바구니에 상품 두 줄을 담는다', async () => {
      await 두줄담기(page.request);
    });

    await test.step('장바구니에 상품 두 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 두 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 2, { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.줄들.nth(1).waitFor();
      await verify('장바구니 줄 체크박스는 처음에 모두 켜져 있다', (await 장바구니.줄체크상태들()).join(', '), 'true, true');
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
