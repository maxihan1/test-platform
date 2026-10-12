import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 기다려보기, 두줄담기, 세션사용자 } from './helpers/shop-tools.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-170',
  name: '두 줄을 켜고 「선택 삭제」를 누르면 확인 창 「선택한 상품 2개를 삭제하시겠습니까?」가 뜬다',
  precondition: ['장바구니에 상품 두 줄이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
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

    await test.step('장바구니 화면이 떴는지 확인한다', async () => {
      await 장바구니.줄들.first().waitFor();
      await verify('장바구니에 상품 줄 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    await test.step('「선택 삭제」를 누른다', async () => {
      await 장바구니.선택삭제.click();
      await 확인창.제목.waitFor();
      await verify('두 줄을 켜고 「선택 삭제」를 누르면 확인 창 「선택한 상품 2개를 삭제하시겠습니까?」가 뜬다', await 확인창.본문.innerText(), '선택한 상품 2개를 삭제하시겠습니까?');
    });

    await test.step('첫 줄만 켜고 「선택 삭제」를 누른 뒤 확인 창에서 「확인」을 누른다', async () => {
      await 장바구니.열기();
      await 장바구니.줄들.nth(1).waitFor();
      const 첫이름 = (await 장바구니.줄이름(장바구니.줄들.first()).innerText()).trim();
      const 둘째이름 = (await 장바구니.줄이름(장바구니.줄들.nth(1)).innerText()).trim();
      await 장바구니.줄체크(장바구니.줄들.nth(1)).uncheck();
      await 장바구니.선택삭제.click();
      await 확인창.버튼('확인').click();
      await 기다려보기(장바구니.줄들.nth(1).waitFor({ state: 'detached', timeout: 5000 }));
      await verify('「선택 삭제」를 확인하면 체크한 줄만 지워진다', [await 장바구니.줄(첫이름).count(), await 장바구니.줄(둘째이름).count()], [0, 1]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
