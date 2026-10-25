import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품들, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-169',
  name: '「전체 선택」을 끄면 모든 줄 체크가 꺼진다',
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
    await test.step('장바구니 「전체 선택」을 끈다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 둘 보이고 모두 체크되어 있다', await 장바구니.체크줄수(), 2, { blocker: true });
      await 장바구니.모든체크끄기();
      await verify('「전체 선택」을 끄면 모든 줄 체크가 꺼진다', await 장바구니.체크줄수(), 0);
    });

    await test.step('장바구니 줄 하나의 체크를 끈다', async () => {
      await 장바구니.전체선택.check();
      await verify('모든 줄이 다시 체크되어 있다', await 장바구니.체크줄수(), 2, { blocker: true });
      await 장바구니.줄체크(상품들[0].name).uncheck();
      await verify('줄 하나의 체크를 끄면 「전체 선택」도 꺼진다', await 장바구니.전체선택.isChecked(), false);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
