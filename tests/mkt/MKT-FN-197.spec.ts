import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 두줄담기 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-197',
  name: '아무것도 켜지 않고 「선택 삭제」를 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 토스 = new 토스트(page);

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

    await test.step('모든 줄을 끄고 「선택 삭제」를 누른다', async () => {
      await 장바구니.모든줄체크끄기();
      await 장바구니.선택삭제.click();
      await 토스.알림들.first().waitFor();
      await verify('아무것도 켜지 않고 「선택 삭제」를 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다', await 토스.글('삭제할 상품을 선택하세요').first().isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
