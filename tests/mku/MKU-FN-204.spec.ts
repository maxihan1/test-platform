import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니담기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-204',
  name: '담은 상품이 0개면 장바구니 상품 줄과 결제 요약이 보이지 않는다',
  techniques: ['경계값 분석'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('담은 상품이 없는 채 장바구니를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.불러오기끝나기를기다리기();
      await verify('담은 상품이 0개면 장바구니 상품 줄과 결제 요약이 보이지 않는다', [await 장바구니.줄들.count(), await 장바구니.요약.isVisible()], [0, false]);
    });

    await test.step('상품 한 줄을 담고 장바구니를 연다', async () => {
      const 상품 = await 옵션없는상품(page.request);
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1 });
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await verify('상품 한 줄을 담으면 「장바구니가 비어 있습니다」가 보이지 않는다', await 장바구니.빈문구.isVisible(), false);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
