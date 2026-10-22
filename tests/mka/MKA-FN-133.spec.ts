import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기, 장바구니읽기, type 장바구니줄 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-133',
  name: '같은 상품 · 같은 옵션을 다시 담으면 장바구니 그 줄의 수량이 더해진다',
  platforms: ['android'],
  precondition: ['장바구니에 같은 상품 · 같은 옵션이 한 줄 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('색상 · 사이즈 옵션이 있는 상품 번호 — 품절이 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 보관: { 앞줄들?: 장바구니줄[] } = {};
  const 처음수량 = 1;

  try {
    await test.step('서버에서 장바구니에 옵션 상품을 한 줄 담아 둔다', async () => {
      await 서버로그인(request, 아이디, 비밀번호);
      보관.앞줄들 = await 장바구니읽기(request);
      const 상품 = await 상품읽기(request, params.옵션상품번호);
      await 장바구니바꾸기(request, [{ productId: 상품.id, color: 상품.colors?.[0] ?? '', size: 상품.sizes?.[0] ?? '', qty: 처음수량 }]);
      const 같은줄 = (await 장바구니읽기(request)).filter(
        (줄) => 줄.productId === 상품.id && 줄.color === (상품.colors?.[0] ?? '') && 줄.size === (상품.sizes?.[0] ?? ''),
      );
      await verify('장바구니에 같은 상품 · 같은 옵션이 한 줄 있다', 같은줄.length, 1, { blocker: true });
    });

    await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 목록에서 옵션 상품 상세를 연다', async () => {
      const 상품 = await 상품읽기(request, params.옵션상품번호);
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('같은 옵션으로 다시 「장바구니 담기」를 누른다', async () => {
      const 상품 = await 상품읽기(request, params.옵션상품번호);
      await 상세.옵션찾아고르기();
      await 상세.담기누르기();
      await new 토스트(driver).뜰때까지();
      const 같은줄 = (await 장바구니읽기(request)).filter(
        (줄) => 줄.productId === 상품.id && 줄.color === (상품.colors?.[0] ?? '') && 줄.size === (상품.sizes?.[0] ?? ''),
      );
      await verify('장바구니에 같은 줄이 하나만 있다', 같은줄.length, 1);
      await verify('같은 상품 · 같은 옵션을 다시 담으면 장바구니 그 줄의 수량이 더해진다', 같은줄[0]?.qty ?? 0, 처음수량 + 1);
    });
  } finally {
    if (보관.앞줄들 !== undefined) await 장바구니되돌리기(request, 보관.앞줄들);
  }
});
