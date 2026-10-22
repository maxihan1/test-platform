import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, type 장바구니줄 } from './helpers/api.helper.js';
import { 장바구니다시열기, 장바구니열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-194',
  name: '장바구니 줄이 0개면 「장바구니가 비어 있습니다」가 보인다',
  platforms: ['android'],
  precondition: ['장바구니가 비어 있다', '장바구니에 상품 한 줄이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션없는상품번호: z.number().describe('옵션이 없는 상품 번호 — 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  try {
    await test.step('서버 장바구니를 비운다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, []);
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
      await verify('장바구니 화면이 보인다', await 장바구니.보이는가(), true, { blocker: true });

      await verify('장바구니 줄이 0개면 「장바구니가 비어 있습니다」가 보인다', await 장바구니.글이보이나('장바구니가 비어 있습니다'), true);
    });

    await test.step('서버 장바구니에 상품 한 줄을 담고 장바구니를 다시 연다', async () => {
      await 장바구니바꾸기(request, [{ productId: params.옵션없는상품번호 }]);
      await 장바구니다시열기(driver);
    });

    await test.step('줄이 한 개일 때 안내 문구를 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      await verify('장바구니에 상품 한 줄이 보인다', await 장바구니.줄수(), 1, { blocker: true });

      await verify('장바구니 줄이 1개면 「장바구니가 비어 있습니다」가 보이지 않는다', await 장바구니.글이보이나('장바구니가 비어 있습니다'), false);
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
