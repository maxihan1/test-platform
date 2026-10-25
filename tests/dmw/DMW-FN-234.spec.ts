import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품들, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-234',
  name: '체크한 상품이 하나라도 있으면 「주문하기」 버튼이 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상품들 = await 넉넉한상품들(request, 2, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  for (const 상품 of 상품들) await 상품담기(page.request, 상품, 1);

  try {
    await test.step('장바구니 줄 하나만 체크한다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 둘 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
      await 장바구니.모든체크끄기();
      await 장바구니.줄체크(상품들[0].name).check();
      await verify('줄 하나만 체크되어 있다', await 장바구니.체크줄수(), 1, { blocker: true });
      await verify('체크한 상품이 하나라도 있으면 「주문하기」 버튼이 눌린다', await 장바구니.주문하기.isEnabled(), true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
