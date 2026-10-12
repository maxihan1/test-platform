import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품두줄담기, 장바구니보기 } from './helpers/cart.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-365',
  name: '「전체 선택」을 끄면 「주문하기」 버튼이 비활성이다',
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);

  try {
    await test.step('새 회원으로 가입해 로그인하고 장바구니에 상품 두 줄을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      await 상품두줄담기(page.request);
    });

    await test.step('장바구니에 상품 두 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 두 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 2, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기();
    });

    await test.step('장바구니 화면이 열렸는지 확인한다', async () => {
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니 화면이 열려 있다', 경로(page), 장바구니화면.주소, { blocker: true });
      await verify('장바구니 화면에 상품 줄 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });


    await test.step('장바구니에서 「전체 선택」을 끈다', async () => {
      await 장바구니.전체선택.uncheck();
      await verify('「전체 선택」을 끄면 「주문하기」 버튼이 비활성이다', await 장바구니.주문하기.isDisabled(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
