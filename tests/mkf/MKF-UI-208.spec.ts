import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-UI-208',
  name: '주문서 위쪽 단계 표시에 「① 배송 정보」 · 「② 결제 수단」 · 「③ 최종 확인」이 보인다',
  precondition: ['장바구니에 상품이 담긴 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('장바구니에서 「주문하기」를 눌러 주문서를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.줄들.first().waitFor();
      await 장바구니.주문하기.click();
      await 주문서.받는분.waitFor();
      await verify('주문서 위쪽 단계 표시에 「① 배송 정보」 · 「② 결제 수단」 · 「③ 최종 확인」이 보인다', await 주문서.단계항목들.allInnerTexts(), ['① 배송 정보', '② 결제 수단', '③ 최종 확인']);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
