import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니열기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-117',
  name: '품절된 상품 줄에 「품절」이 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 품절된 상품 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    품절상품명: z.string().describe('장바구니에 든 채 품절된 상품 이름'),
  }),
  expected: null,
  held: '보류 — 품절 상품이 든 장바구니를 만들 길이 없다(서버가 품절 상품 담기를 막는다)',
});

test(spec, async ({ driver, params }) => {
  await test.step('앱에서 로그인한다', async () => {
    await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인 뒤 화면을 확인한다', async () => {
    await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
  });

  await test.step('장바구니를 연다', async () => {
    await 장바구니열기(driver);
    const 장바구니 = new 장바구니화면(driver);
    await verify('장바구니에 품절된 상품 줄이 보인다', (await 장바구니.줄이름들()).includes(params.품절상품명), true, { blocker: true });

    await verify('품절된 상품 줄에 「품절」이 보인다', (await 장바구니.줄글들(params.품절상품명)).includes('품절'), true);
  });
});
