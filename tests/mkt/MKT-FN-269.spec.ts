import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-269',
  name: '장바구니가 0개면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니가 비어 있다', '새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('장바구니가 비어 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니가 비어 있다', (await 장바구니목록(page.request)).length, 0, { blocker: true });
    });

    await test.step('빈 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      const 부분 = [
        ['장바구니가 비어 있습니다', 장바구니.비었음문구],
        ['쇼핑하러 가기', 장바구니.쇼핑하러가기],
      ] as const;
      const 보이는 = [];
      for (const [이름, 요소] of 부분) if (await 요소.isVisible()) 보이는.push(이름);
      await verify('장바구니가 0개면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다', 보이는.join(' · '), '장바구니가 비어 있습니다 · 쇼핑하러 가기');
    });

    await test.step('장바구니에 상품을 하나 담는다', async () => {
      await 장바구니담기(page.request, params.productId);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('상품 하나가 담긴 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await verify('장바구니가 1개면 「장바구니가 비어 있습니다」가 보이지 않는다', await 장바구니.비었음문구.isVisible(), false);
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
