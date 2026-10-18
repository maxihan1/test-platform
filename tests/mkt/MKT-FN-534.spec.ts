import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 장바구니응답가짜로 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-534',
  name: '상품 금액 합이 45,000원이면 「5,000원 더 담으면 무료 배송」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['장바구니 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 이름 = (await 상품정보(page.request, 2)).name;
    const 거두기 = await 장바구니응답가짜로(page, () => [{ id: 1, productId: 2, name: 이름, unitPrice: 45000, qty: 1 }]);

    try {
      await test.step('새로 가입한 회원으로 로그인한다', async () => {
        await 방해창막기(page);
        상태.회원 = await 새회원으로로그인(page.request);
      });

      await test.step('상품 금액 합이 45,000원인 장바구니를 연다', async () => {
        await 장바구니.열기();
        await verify('상품 금액이 45,000원이다', await 장바구니.요약값('상품 금액').innerText(), '45,000원', { blocker: true });
        await verify('상품 금액 합이 45,000원이면 「5,000원 더 담으면 무료 배송」이 보인다', await 장바구니.무료배송안내.innerText(), '5,000원 더 담으면 무료 배송');
      });
    } finally {
      await 거두기();
    }
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
