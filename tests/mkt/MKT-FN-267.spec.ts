import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록, 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-267',
  name: '체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 이름 = (await 상품정보(page.request, params.productId)).name;

    await test.step('새로 가입한 회원의 장바구니에 상품을 하나 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.productId);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니의 모든 줄을 끈다', async () => {
      await 장바구니.열기();
      await 장바구니.줄체크(장바구니.줄(이름)).uncheck();
      await verify('체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다', await 장바구니.주문하기.isDisabled(), true);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
