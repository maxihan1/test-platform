import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, type 장바구니줄 } from './helpers/api.helper.js';
import { 장바구니열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-060',
  name: '장바구니 아래에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 두 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    첫상품번호: z.number().describe('장바구니에 담을 첫 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    둘째상품번호: z.number().describe('장바구니에 담을 둘째 상품 번호 — 첫 상품과 다르고 옵션이 없고 품절이 아닌 상품').default(20),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [{ productId: params.첫상품번호 }, { productId: params.둘째상품번호 }]);
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('장바구니를 연다', async () => {
      await 장바구니열기(driver);
      const 장바구니 = new 장바구니화면(driver);
      await verify('장바구니에 상품 두 줄이 보인다', await 장바구니.줄수(), 2, { blocker: true });

      const 상품금액 = await verify('「상품 금액」이 보인다', await 장바구니.글이보이나('상품 금액'), true);
      const 배송비 = await verify('「배송비」가 보인다', await 장바구니.글이보이나('배송비'), true);
      const 결제예정금액 = await verify('「결제 예정 금액」이 보인다', await 장바구니.글이보이나('결제 예정 금액'), true);
      await verify('장바구니 아래에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다', 상품금액 && 배송비 && 결제예정금액, true);
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
