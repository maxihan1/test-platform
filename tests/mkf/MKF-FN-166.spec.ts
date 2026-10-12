import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-166',
  name: '수량 9 인 줄에 1개를 더 담으면 수량이 10 이 된다',
  techniques: ['경계값 분석'],
  precondition: ['장바구니에 같은 상품이 수량 9 로 담긴 회원으로 로그인해 있다', '장바구니에 같은 상품이 수량 10 으로 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  const 상품 = await 옵션없는상품(page.request);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('장바구니에 같은 상품을 수량 9 로 담는다', async () => {
      await 장바구니담기(page.request, { productId: 상품.id, qty: 9 });
    });

    await test.step('장바구니에 수량 9 인 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 수량 9 인 줄 한 줄이 담겨 있다', (await 장바구니보기(page.request)).map((줄) => 줄.qty), [9], { blocker: true });
    });

    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('같은 상품 · 같은 옵션을 1개 더 담는다', async () => {
      const 첫응답 = page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/cart' && 응답.request().method() === 'POST');
      await 상세.담기.click();
      await 첫응답;
      const 열번째 = await 장바구니보기(page.request);
      await verify('수량 9 인 줄에 1개를 더 담으면 수량이 10 이 된다', [열번째.length, 열번째[0]?.qty], [1, 10]);
      const 둘째응답 = page.waitForResponse((응답) => new URL(응답.url()).pathname === '/api/cart' && 응답.request().method() === 'POST');
      await 상세.담기.click();
      await 둘째응답;
      const 이후 = await 장바구니보기(page.request);
      await verify('수량 10 인 줄에 1개를 더 담아도 수량은 10 이다', [이후.length, 이후[0]?.qty], [1, 10]);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
