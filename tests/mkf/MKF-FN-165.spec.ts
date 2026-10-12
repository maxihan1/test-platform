import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션있는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-165',
  name: '같은 상품 · 같은 옵션을 다시 담으면 줄이 늘지 않고 수량이 2 가 된다',
  precondition: ['장바구니에 상품 한 줄이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  const 상품 = await 옵션있는상품(page.request);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('장바구니에 상품 한 줄을 담는다', async () => {
      await 장바구니담기(page.request, { productId: 상품.id, qty: 1, color: 상품.colors?.[0], size: 상품.sizes?.[0] });
    });

    await test.step('장바구니에 상품 한 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 한 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 1, { blocker: true });
    });

    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('같은 상품 · 같은 옵션을 한 번 더 담는다', async () => {
      await 상세.옵션고르기(상품.colors?.[0], 상품.sizes?.[0]);
      const 응답 = page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/cart' && 응답.request().method() === 'POST');
      await 상세.담기.click();
      await 응답;
      const 줄들 = await 장바구니보기(page.request);
      await verify('같은 상품 · 같은 옵션을 다시 담으면 줄이 늘지 않고 수량이 2 가 된다', [줄들.length, 줄들[0]?.qty], [1, 2]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
