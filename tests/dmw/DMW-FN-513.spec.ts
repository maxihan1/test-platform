import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 가짜줄, 장바구니목록가짜로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-513',
  name: '체크한 상품 금액이 49,999원이면 배송비가 3,000원이다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다', '장바구니 목록은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  let 풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ unitPrice: 49999 })]);

  try {
    await test.step('체크한 상품 금액이 49,999원인 장바구니를 연다', async () => {
      await 장바구니.열기();
      await verify('체크한 상품 금액이 49,999원이다', await 장바구니.상품금액읽기(), 49999, { blocker: true });
      await verify('체크한 상품 금액이 49,999원이면 배송비가 3,000원이다', await 장바구니.배송비읽기(), 3000);
    });

    await test.step('49,999원 장바구니의 무료 배송 안내를 확인한다', async () => {
      await verify('체크한 상품 금액이 49,999원이면 「1원 더 담으면 무료 배송」이 보인다', await 장바구니.무료배송안내.innerText(), '1원 더 담으면 무료 배송');
    });

    await test.step('체크한 상품 금액이 50,000원인 장바구니를 연다', async () => {
      await 풀기();
      풀기 = await 장바구니목록가짜로돌리기(page, [가짜줄({ unitPrice: 50000 })]);
      await 장바구니.열기();
      await verify('체크한 상품 금액이 50,000원이다', await 장바구니.상품금액읽기(), 50000, { blocker: true });
      await verify('체크한 상품 금액이 50,000원이면 배송비가 0원이다', await 장바구니.배송비읽기(), 0);
    });
  } finally {
    await 풀기();
  }
});
