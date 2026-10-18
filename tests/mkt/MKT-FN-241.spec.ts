import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-241',
  name: '같은 상품 · 같은 옵션을 더해 10개가 되면 장바구니에 한 줄 · 수량 10으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    productId: z.number().describe('담아 볼 상품 번호 — 옵션이 없고 품절이 아니며 재고가 10개를 넘는 상품').default(8),
    firstQuantity: z.number().describe('처음 담을 수량').default(4),
    secondQuantity: z.number().describe('이어 담을 수량 — 처음 수량과 더해 10').default(6),
    extraQuantity: z.number().describe('이미 10개 담긴 상품에 더 담을 수량').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태인지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    const 이름 = (await 상품정보(page.request, params.productId)).name;

    await test.step('같은 상품 · 같은 옵션을 4개 담고 6개를 더 담는다', async () => {
      await 상세.열기(params.productId);
      await 상세.수량넣기(params.firstQuantity);
      await 상세.담기누르고응답기다리기();
      await 상세.수량넣기(params.secondQuantity);
      await 상세.담기누르고응답기다리기();
      await 장바구니.열기();
      const 줄 = 장바구니.줄(이름);
      await verify('같은 상품 · 같은 옵션을 더해 10개가 되면 장바구니에 한 줄 · 수량 10으로 보인다', `${await 줄.count()}줄, 수량 ${await 장바구니.줄수량칸(줄).inputValue()}`, '1줄, 수량 10');
    });

    await test.step('수량 10이 담긴 상품을 1개 더 담는다', async () => {
      await 상세.열기(params.productId);
      await 상세.수량넣기(params.extraQuantity);
      await 상세.담기누르고응답기다리기();
      await 장바구니.열기();
      await verify('같은 상품 · 같은 옵션이 11개가 되게 담아도 장바구니 수량은 10이다', await 장바구니.줄수량칸(장바구니.줄(이름)).inputValue(), '10');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
