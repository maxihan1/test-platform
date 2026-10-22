import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 배송비, 장바구니다시열기, 장바구니열기, 줄찾기 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-181',
  name: '체크한 줄이 없으면 「배송비」가 0원이다',
  platforms: ['android'],
  precondition: ['장바구니에 상품 두 줄이 있다', '장바구니에 판매가 47,900원 상품 한 줄만 있다', '장바구니에 판매가 50,000원이 넘는 상품 한 줄만 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    첫상품번호: z.number().describe('장바구니에 담을 첫 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
    둘째상품번호: z.number().describe('장바구니에 담을 둘째 상품 번호 — 첫 상품과 다르고 옵션이 없고 품절이 아닌 상품').default(20),
    배송비붙는상품번호: z.number().describe('판매가 47,900원인 옵션 없는 상품 번호').default(20),
    배송비없는상품번호: z.number().describe('판매가 50,000원이 넘는 옵션 없는 상품 번호').default(10),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  let 이름들: string[] = [];
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [{ productId: params.첫상품번호 }, { productId: params.둘째상품번호 }]);
      이름들 = (await 장바구니읽기(request)).map((줄) => 줄.name);
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

    await test.step('장바구니에 담은 줄을 확인한다', async () => {
      await verify('장바구니에 상품 두 줄이 보인다', await new 장바구니화면(driver).줄수(), 2, { blocker: true });
    });

    await test.step('모든 줄의 체크를 끈다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      for (const 이름 of 이름들) await 장바구니.줄체크(이름).click();
      await 장바구니.켜진줄체크수바뀔때까지(0);
      await 장바구니.배송비바뀔때까지(원(배송비(0, 0)));
      await verify('체크한 줄이 없으면 「배송비」가 0원이다', await 장바구니.배송비글(), 원(배송비(0, 0)));
    });

    await test.step('서버 장바구니를 판매가 47,900원 상품 한 줄로 바꾸고 장바구니를 다시 연다', async () => {
      await 장바구니바꾸기(request, [{ productId: params.배송비붙는상품번호 }]);
      await 장바구니다시열기(driver);
    });

    await test.step('47,900원 상품 한 줄의 「배송비」를 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      const 줄 = 줄찾기(await 장바구니읽기(request), params.배송비붙는상품번호);
      await verify('판매가 47,900원 상품 한 줄이 보인다', await 장바구니.상품금액글(), '47,900원', { blocker: true });
      await 장바구니.배송비바뀔때까지(원(배송비(줄.unitPrice * 줄.qty, 1)));
      await verify('「상품 금액」이 50,000원 미만이면 「배송비」가 3,000원이다', await 장바구니.배송비글(), 원(배송비(줄.unitPrice * 줄.qty, 1)));
    });

    await test.step('서버 장바구니를 판매가 50,000원이 넘는 상품 한 줄로 바꾸고 장바구니를 다시 연다', async () => {
      await 장바구니바꾸기(request, [{ productId: params.배송비없는상품번호 }]);
      await 장바구니다시열기(driver);
    });

    await test.step('50,000원이 넘는 상품 한 줄의 「배송비」를 확인한다', async () => {
      const 장바구니 = new 장바구니화면(driver);
      const 줄 = 줄찾기(await 장바구니읽기(request), params.배송비없는상품번호);
      await verify('판매가 50,000원이 넘는 상품 한 줄이 보인다', (await 장바구니.줄수()) === 1 && 줄.unitPrice > 50000, true, { blocker: true });
      await 장바구니.배송비바뀔때까지(원(배송비(줄.unitPrice * 줄.qty, 1)));
      await verify('「상품 금액」이 50,000원 이상이면 「배송비」가 0원이다', await 장바구니.배송비글(), 원(배송비(줄.unitPrice * 줄.qty, 1)));
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
