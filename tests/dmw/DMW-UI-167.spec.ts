import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-167',
  name: '장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 상품, 1);

  try {
    await test.step('상품을 담은 장바구니를 연다', async () => {
      await 장바구니.열기();
      await verify('담은 상품 줄이 보인다', await 장바구니.줄(상품.name).isVisible(), true, { blocker: true });
      const 이미지 = await verify('이미지가 보인다', await 장바구니.줄이미지(상품.name).isVisible(), true);
      const 이름 = await verify('상품명이 보인다', await 장바구니.줄상품명링크(상품.name).isVisible(), true);
      const 옵션 = await verify('옵션이 보인다', await 장바구니.줄옵션글(상품.name), `${상품.colors[0]} / ${상품.sizes[0]}`);
      const 수량 = await verify('수량이 보인다', await 장바구니.줄수량(상품.name).isVisible(), true);
      const 금액 = await verify('금액이 보인다', await 장바구니.줄금액(상품.name).isVisible(), true);
      await verify('장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다', 이미지 && 이름 && 옵션 && 수량 && 금액, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
