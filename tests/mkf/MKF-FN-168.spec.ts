import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 장바구니모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-168',
  name: '상품 금액 합이 49,999원이면 「1원 더 담으면 무료 배송」이 보인다',
  techniques: ['경계값 분석'],
  precondition: ['장바구니 응답은 상품 금액 합이 49,999원인 가짜 응답(모킹)이다', '장바구니 응답은 상품 금액 합이 50,000원인 가짜 응답(모킹)이다'],
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

    await test.step('장바구니 결제 요약을 확인한다', async () => {
      const 해제49999 = await 장바구니모킹(page, 49999);
      try {
        await 장바구니.열기();
        await 장바구니.줄들.first().waitFor();
        await verify('장바구니 요약 상품 금액이 시험할 금액이다', await 장바구니.요약상품금액.innerText(), '49,999원', { blocker: true });
        await verify('상품 금액 합이 49,999원이면 「1원 더 담으면 무료 배송」이 보인다', (await 장바구니.무료배송안내.isVisible()) && (await 장바구니.무료배송안내.innerText()) === '1원 더 담으면 무료 배송', true);
      } finally {
        await 해제49999();
      }

      const 해제50000 = await 장바구니모킹(page, 50000);
      try {
        await 장바구니.열기();
        await 장바구니.줄들.first().waitFor();
        await verify('장바구니 요약 상품 금액이 시험할 금액이다', await 장바구니.요약상품금액.innerText(), '50,000원', { blocker: true });
        await verify('상품 금액 합이 50,000원이면 무료 배송까지 남은 금액 안내가 보이지 않는다', await 장바구니.무료배송안내.isVisible(), false);
      } finally {
        await 해제50000();
      }
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
