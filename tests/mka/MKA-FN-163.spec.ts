import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 장바구니열기, 줄찾기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-163',
  name: '장바구니에서 수량을 바꾸면 서버의 장바구니 수량이 바로 2로 저장된다',
  platforms: ['android'],
  precondition: ['장바구니에 수량 1인 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션없는상품번호: z.number().describe('옵션이 없는 상품 번호 — 품절이 아니고 재고가 2개 이상인 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  let 줄 = { name: '', unitPrice: 0 };
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [{ productId: params.옵션없는상품번호, qty: 1 }]);
      줄 = 줄찾기(await 장바구니읽기(request), params.옵션없는상품번호);
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니열기(driver);
    });

    await test.step('장바구니에 담은 줄을 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      await verify('장바구니에 수량 1인 줄이 보인다', await 장바구니.줄수량(줄.name).getText(), '1', { blocker: true });
    });

    await test.step('그 줄의 「+」를 누른다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      await 장바구니.줄더하기(줄.name).click();
      await 장바구니.줄수량바뀔때까지(줄.name, '2');
      await 장바구니.줄금액바뀔때까지(줄.name, 원(줄.unitPrice * 2));
      await 장바구니.상품금액바뀔때까지(원(줄.unitPrice * 2));

      await verify('장바구니에서 수량을 바꾸면 서버의 장바구니 수량이 바로 2로 저장된다', 줄찾기(await 장바구니읽기(request), params.옵션없는상품번호).qty, 2);
      await verify('장바구니에서 수량을 2로 바꾸면 줄 금액이 판매가의 두 배로 바뀐다', await 장바구니.줄금액글(줄.name), 원(줄.unitPrice * 2));
      await verify('장바구니에서 수량을 바꾸면 아래 「상품 금액」이 체크한 줄 금액의 합으로 바뀐다', await 장바구니.상품금액글(), 원(줄.unitPrice * 2));
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
