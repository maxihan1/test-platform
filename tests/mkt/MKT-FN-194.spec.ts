import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 두줄담기, 원 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-194',
  name: '줄 수량을 2로 올리면 그 줄 금액이 두 배로 바뀐다',
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
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

    await test.step('장바구니 화면을 준비한다', async () => {
      await 장바구니.열기();
    });

    await test.step('장바구니 화면이 떴는지 확인한다', async () => {
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 상품 줄 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    await test.step('첫 줄 수량을 「+」로 2로 올린다', async () => {
      const 줄API = (await 장바구니보기(page.request))[0];
      const 줄 = 장바구니.줄(줄API?.name ?? '');
      const 금액전 = await 장바구니.금액숫자(장바구니.줄금액(줄));
      const 요약전 = await 장바구니.금액숫자(장바구니.요약상품금액);
      await 장바구니.줄늘리기(줄).click();
      await 장바구니.줄금액(줄).filter({ hasNotText: 원(금액전) }).waitFor();
      await verify('줄 수량을 2로 올리면 그 줄 금액이 두 배로 바뀐다', await 장바구니.금액숫자(장바구니.줄금액(줄)), 금액전 * 2);
      await verify('줄 수량을 올리면 결제 요약 「상품 금액」이 바로 바뀐다', await 장바구니.금액숫자(장바구니.요약상품금액), 요약전 + 금액전);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
