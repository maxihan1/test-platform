import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품들, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-168',
  name: '장바구니를 열면 줄마다 체크박스가 모두 체크되어 있다',
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
    await test.step('상품 둘을 담은 장바구니를 연다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 둘 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
      await verify('장바구니를 열면 줄마다 체크박스가 모두 체크되어 있다', await 장바구니.체크줄수(), 2);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
