import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 장바구니열기, 줄찾기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-161',
  name: '장바구니에서 수량이 1인 줄은 「−」 버튼이 눌리지 않는다',
  platforms: ['android'],
  precondition: ['장바구니에 수량 1인 줄이 있다', '장바구니에 수량 10인 줄이 있다', '장바구니에 재고가 1개인 상품 줄이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    수량1상품번호: z.number().describe('수량 1로 담을 상품 번호 — 옵션이 없고 재고가 1개보다 많은 상품').default(34),
    수량10상품번호: z.number().describe('수량 10으로 담을 상품 번호 — 옵션이 없고 재고가 10개 이상인 상품').default(20),
    재고1상품번호: z.number().describe('재고가 1개인 옵션 없는 상품 번호').default(12),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  let 줄들: 장바구니줄[] = [];
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [
        { productId: params.수량1상품번호, qty: 1 },
        { productId: params.수량10상품번호, qty: 10 },
        { productId: params.재고1상품번호, qty: 1 },
      ]);
      줄들 = await 장바구니읽기(request);
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
      await verify('장바구니에 상품 세 줄이 보인다', await 장바구니.줄수(), 3, { blocker: true });

      await verify('장바구니에서 수량이 1인 줄은 「−」 버튼이 눌리지 않는다', await 장바구니.줄빼기눌리나(줄찾기(줄들, params.수량1상품번호).name), false);
      await verify('장바구니에서 수량이 10인 줄은 「+」 버튼이 눌리지 않는다', await 장바구니.줄더하기눌리나(줄찾기(줄들, params.수량10상품번호).name), false);
      await verify('장바구니에서 재고가 1개인 상품 줄은 수량 1에서 「+」 버튼이 눌리지 않는다', await 장바구니.줄더하기눌리나(줄찾기(줄들, params.재고1상품번호).name), false);
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
