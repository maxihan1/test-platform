import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 나타나는가, 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-230',
  name: '아무것도 체크하지 않고 「선택 삭제」를 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 알림 = new 토스트(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 상품, 1);

  try {
    await test.step('모든 체크를 끄고 「선택 삭제」를 누른다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 장바구니.모든체크끄기();
      await verify('모든 줄의 체크가 꺼져 있다', await 장바구니.체크줄수(), 0, { blocker: true });
      await 장바구니.선택삭제.click();
      await verify('아무것도 체크하지 않고 「선택 삭제」를 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다', await 나타나는가(알림.글('삭제할 상품을 선택하세요')), true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
