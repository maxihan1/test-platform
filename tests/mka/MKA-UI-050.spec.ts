import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 서버로그인, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 장바구니열기, 줄찾기, 첫옵션줄 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-050',
  name: '장바구니 맨 위 줄에 「장바구니」가 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 옵션 있는 상품 한 줄과 옵션 없는 상품 한 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('옵션이 있는 상품 번호 — 색상 · 사이즈가 있고 품절이 아닌 상품').default(1),
    옵션없는상품번호: z.number().describe('옵션이 없는 상품 번호 — 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞줄들 = null as 장바구니줄[] | null;
  try {
    await test.step('서버 장바구니에 상품을 담는다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞줄들 = await 장바구니바꾸기(request, [await 첫옵션줄(request, params.옵션상품번호), { productId: params.옵션없는상품번호 }]);
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
      const 줄들 = await 장바구니읽기(request);

      await verify('장바구니 맨 위 줄에 「장바구니」가 보인다', await new 머리줄(driver).제목글(), '장바구니');

      const 빠진: string[] = [];
      for (const 줄 of 줄들) {
        const 빠짐 = await 장바구니.줄에빠진요소(줄.name);
        if (빠짐 !== '') 빠진.push(`${줄.name}: ${빠짐}`);
      }
      await verify('장바구니 줄마다 체크박스 · 상품명 · 줄 금액 · 「−」 · 수량 · 「+」가 보인다', 빠진.join(' / '), '');

      const 옵션있는줄 = 줄찾기(줄들, params.옵션상품번호);
      await verify('옵션 있는 줄에 옵션이 「{색상} / {사이즈}」 꼴로 보인다', await 장바구니.줄옵션글(옵션있는줄.name), `${옵션있는줄.color} / ${옵션있는줄.size}`);

      const 화면금액들: string[] = [];
      for (const 줄 of 줄들) 화면금액들.push(await 장바구니.줄금액글(줄.name));
      await verify('장바구니 줄 금액이 판매가 × 수량으로 보인다', 화면금액들.join(', '), 줄들.map((줄) => 원(줄.unitPrice * 줄.qty)).join(', '));
    });
  } finally {
    if (앞줄들 !== null) await 장바구니되돌리기(request, 앞줄들);
  }
});
