import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-201',
  name: '켠 상품 금액 합이 49,999원이면 배송비가 3,000원이다',
  techniques: ['경계값 분석'],
  precondition: ['장바구니 응답은 가짜 응답(모킹)이다'],
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

    const 장바구니주소 = /\/api\/cart(\?.*)?$/;
    let 단가 = 49999;

    try {
      await test.step('장바구니 응답을 가짜로 바꾼다', async () => {
        const 모킹상품 = await 옵션없는상품(page.request);
        await page.context().route(장바구니주소, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [{ id: 9001, productId: 모킹상품.id, name: 모킹상품.name, color: '', size: '', qty: 1, unitPrice: 단가, maxQty: 10, soldOut: false }] }),
          });
        });
      });

      await test.step('상품 금액 합이 49,999원인 장바구니를 연다', async () => {
        단가 = 49999;
        await 장바구니.열기();
        await 장바구니.줄들.first().waitFor();
        await verify('켠 상품 금액 합이 49,999원이면 배송비가 3,000원이다', await 장바구니.요약배송비.innerText(), '3,000원');
      });

      await test.step('상품 금액 합이 50,000원인 장바구니를 연다', async () => {
        단가 = 50000;
        await 장바구니.열기();
        await 장바구니.줄들.first().waitFor();
        await verify('켠 상품 금액 합이 50,000원이면 배송비가 0원이다', await 장바구니.요약배송비.innerText(), '0원');
      });
    } finally {
      await page.context().unroute(장바구니주소);
    }
  } finally {
    await 탈퇴(page.request);
  }
});
