import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, type 장바구니줄 } from './helpers/api.helper.js';
import { 장바구니열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-066',
  name: '빈 장바구니에서 「쇼핑하러 가기」를 누르면 상품 목록으로 간다',
  platforms: ['android'],
  precondition: ['장바구니가 비어 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
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
    });

    await test.step('빈 장바구니 화면을 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      await verify('장바구니가 비어 있는 화면이 보인다', await 장바구니.글이보이나('장바구니가 비어 있습니다'), true, { blocker: true });
    });

    await test.step('「쇼핑하러 가기」를 누른다', async () => {
      await new 장바구니화면(driver).쇼핑하러가기.click();
      const 목록 = new 상품목록화면(driver);
      await 목록.열릴때까지();
      await verify('빈 장바구니에서 「쇼핑하러 가기」를 누르면 상품 목록으로 간다', await 목록.보이는가(), true);
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
