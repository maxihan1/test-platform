import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 모자란금액, 장바구니열기, 줄찾기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-184',
  name: '배송비가 붙으면 「{모자란 금액} 더 담으면 무료 배송」이 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 판매가 47,900원 상품 한 줄만 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    배송비붙는상품번호: z.number().describe('판매가 47,900원인 옵션 없는 상품 번호').default(20),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  let 줄 = { unitPrice: 0, qty: 0 };
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [{ productId: params.배송비붙는상품번호 }]);
      줄 = 줄찾기(await 장바구니읽기(request), params.배송비붙는상품번호);
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
      await verify('판매가 47,900원 상품 한 줄이 보인다', await 장바구니.상품금액글(), '47,900원', { blocker: true });

      await verify(
        '배송비가 붙으면 「{모자란 금액} 더 담으면 무료 배송」이 보인다',
        await 장바구니.무료배송안내글(),
        `${원(모자란금액(줄.unitPrice * 줄.qty))} 더 담으면 무료 배송`,
      );
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
