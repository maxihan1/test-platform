import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-173',
  name: '장바구니 결제 요약에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 상품, 1);

  try {
    await test.step('장바구니 결제 요약을 확인한다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      const 상품금액 = await verify('「상품 금액」이 보인다', await 장바구니.요약항목('상품 금액').isVisible(), true);
      const 배송비 = await verify('「배송비」가 보인다', await 장바구니.요약항목('배송비').isVisible(), true);
      const 예정금액 = await verify('「결제 예정 금액」이 보인다', await 장바구니.요약항목('결제 예정 금액').isVisible(), true);
      await verify('장바구니 결제 요약에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다', 상품금액 && 배송비 && 예정금액, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
