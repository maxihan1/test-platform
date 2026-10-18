import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보, 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주문완료화면 } from './pages/order-done.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-309',
  name: '결제한 상품은 장바구니에서 빠지고 고르지 않은 줄만 남는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다'],
  params: z.object({
    firstProductId: z.number().describe('결제할 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(26),
    secondProductId: z.number().describe('남겨 둘 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 다른 상품').default(3),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 완료 = new 주문완료화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 첫째이름 = (await 상품정보(page.request, params.firstProductId)).name;
    const 둘째이름 = (await 상품정보(page.request, params.secondProductId)).name;

    await test.step('새로 가입한 회원의 장바구니에 상품 두 줄을 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.firstProductId);
      await 장바구니담기(page.request, params.secondProductId);
    });

    await test.step('장바구니에 상품이 두 줄 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품 두 줄이 담겨 있다', (await 장바구니목록(page.request)).length, 2, { blocker: true });
    });

    await test.step('한 줄만 골라 결제하고 장바구니를 연다', async () => {
      await 장바구니.열기();
      await 장바구니.줄체크(장바구니.줄(둘째이름)).uncheck();
      await 장바구니.주문하기.click();
      await 주문서.배송정보제목.waitFor();
      await 주문서.최종확인단계로가기(기본배송정보(), '무통장입금');
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 완료.주문번호나올때까지();
      await 장바구니.열기();
      await verify('결제한 상품은 장바구니에서 빠지고 고르지 않은 줄만 남는다', (await 장바구니.줄들.getByRole('link').allInnerTexts()).join(', '), 둘째이름);
      await verify('결제한 상품이 장바구니에서 빠진다', await 장바구니.줄(첫째이름).count(), 0);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
