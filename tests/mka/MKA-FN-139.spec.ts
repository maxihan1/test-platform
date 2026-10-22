import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 줄수량들, 줄이름들 } from './helpers/list-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-139',
  name: '「바로 구매」를 눌러도 장바구니 줄과 수량이 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('색상 · 사이즈 옵션이 있는 상품 번호 — 품절이 아닌 상품').default(1),
    옵션없는상품번호: z.number().describe('장바구니에 미리 담아 둘 옵션 없는 상품 번호 — 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 주문 = new 주문하기화면(driver);
  const 보관: { 앞줄들?: 장바구니줄[]; 준비줄들: 장바구니줄[] } = { 준비줄들: [] };

  try {
    await test.step('서버에서 장바구니에 옵션 없는 상품을 한 줄 담아 둔다', async () => {
      await 서버로그인(request, 아이디, 비밀번호);
      보관.앞줄들 = await 장바구니읽기(request);
      await 장바구니바꾸기(request, [{ productId: params.옵션없는상품번호 }]);
      보관.준비줄들 = await 장바구니읽기(request);
      await verify('장바구니에 다른 상품이 한 줄 있다', 보관.준비줄들.length, 1, { blocker: true });
    });

    await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 목록에서 옵션 상품 상세를 연다', async () => {
      const 상품 = await 상품읽기(request, params.옵션상품번호);
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('옵션을 고르고 「바로 구매」를 누른다', async () => {
      await 상세.옵션찾아고르기();
      await 상세.바로구매누르기();
      const 열림 = await 주문.열릴때까지();
      const 뒤줄들 = await 장바구니읽기(request);
      const 열렸음 = await verify('주문하기 화면이 열린다', 열림, true);
      const 줄 = await verify('장바구니 줄이 그대로다', 줄이름들(뒤줄들), 줄이름들(보관.준비줄들));
      const 수량 = await verify('장바구니 수량이 그대로다', 줄수량들(뒤줄들), 줄수량들(보관.준비줄들));
      await verify('「바로 구매」를 눌러도 장바구니 줄과 수량이 그대로다', 열렸음 && 줄 && 수량, true);
    });
  } finally {
    if (보관.앞줄들 !== undefined) await 장바구니되돌리기(request, 보관.앞줄들);
  }
});
