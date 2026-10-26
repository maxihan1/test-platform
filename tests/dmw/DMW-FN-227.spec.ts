import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품들, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-227',
  name: '장바구니 줄 수량을 올리면 그 줄 금액이 바로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const [첫상품, 둘째상품] = await 넉넉한상품들(request, 2, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 첫상품, 1);
  await 상품담기(page.request, 둘째상품, 1);

  try {
    await test.step('장바구니 첫 줄 수량을 2로 올린다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 둘 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
      const 응답 = page.waitForResponse((r) => /\/api\/cart\/\d+$/.test(r.url()) && r.request().method() === 'PATCH');
      await 장바구니.줄수량늘리기(첫상품.name).click();
      await 응답;
      await verify('장바구니 줄 수량을 올리면 그 줄 금액이 바로 바뀐다', await 장바구니.줄금액읽기(첫상품.name), 첫상품.salePrice * 2);
    });

    await test.step('수량을 바꾼 뒤 결제 요약을 확인한다', async () => {
      await verify('장바구니 줄 수량을 올리면 상품 금액 합계가 바로 바뀐다', await 장바구니.상품금액읽기(), 첫상품.salePrice * 2 + 둘째상품.salePrice);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
