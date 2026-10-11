import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 두줄담기, 기다려보기 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-397',
  name: '선택 삭제로 한 줄을 지우면 새로 고치지 않아도 머리글 장바구니 배지가 「1」로 바뀐다',
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 확인창 = new 모달(page);

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

    await test.step('장바구니 화면과 머리글 배지를 확인한다', async () => {
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 상품 줄 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
      await 머리.장바구니배지.waitFor();
      await verify('머리글 장바구니 배지에 「2」가 보인다', await 머리.장바구니배지.innerText(), '2', { blocker: true });
    });

    await test.step('첫 줄만 켜고 「선택 삭제」를 누른 뒤 확인한다', async () => {
      await 장바구니.줄체크(장바구니.줄들.nth(1)).uncheck();
      await 장바구니.선택삭제.click();
      await 확인창.버튼('확인').click();
      await 기다려보기(장바구니.줄들.nth(1).waitFor({ state: 'detached', timeout: 5000 }));
      await verify('장바구니에 상품 줄 한 줄이 남아 있다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 기다려보기(머리.장바구니배지.filter({ hasText: /^1$/ }).waitFor({ timeout: 3000 }));
      await verify('선택 삭제로 한 줄을 지우면 새로 고치지 않아도 머리글 장바구니 배지가 「1」로 바뀐다', await 머리.장바구니배지.innerText(), '1');
    });
  } finally {
    await 탈퇴(page.request);
  }
});
