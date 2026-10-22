import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 장바구니에서주문하기열기, 장바구니열기, 줄만체크하기, 서버정리하기, 서버준비하기, type 정리거리 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-068',
  name: '옵션 없는 상품의 주문 상품 줄은 괄호 없이 「{상품명} × {수량} {금액}」으로 보인다',
  platforms: ['android'],
  precondition: ['장바구니에 옵션 없는 상품 한 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('장바구니에 담을 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 거리: 정리거리 = {};
  let 상품명 = '';
  let 줄글 = '';

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await 서버준비하기(request, params.loginId ?? '', params.loginPassword ?? '', 거리, [{ productId: params.상품번호 }]);
      const 상품 = await 상품읽기(request, params.상품번호);
      상품명 = 상품.name;
      줄글 = `${상품.name} × 1 ${원(상품.salePrice)}`;
      const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
      await verify('상품 목록이 보인다', 열림, true, { blocker: true });
    });

    await test.step('상품 목록에서 장바구니를 연다', async () => {
      const 열림 = await 장바구니열기(driver);
      await verify('장바구니 화면이 보인다', 열림, true, { blocker: true });
      await verify('장바구니에 상품 한 줄이 보인다', await new 장바구니화면(driver).줄수(), 1, { blocker: true });
    });

    await test.step('장바구니에서 「주문하기」를 누른다', async () => {
      await 줄만체크하기(driver, [상품명], 상품명);
      const 열림 = await 장바구니에서주문하기열기(driver);
      await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
      await verify('옵션 없는 상품의 주문 상품 줄은 괄호 없이 「{상품명} × {수량} {금액}」으로 보인다', (await new 주문하기화면(driver).주문상품줄들()).join(', '), 줄글);
    });
  } finally {
    await 서버정리하기(request, 거리);
  }
});
