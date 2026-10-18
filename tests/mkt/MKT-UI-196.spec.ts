import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기, 장바구니목록, 상품정보 } from './helpers/data.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-196',
  name: '장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 색상과 사이즈 옵션이 있고 품절이 아닌 상품').default(5),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    const 정보 = await 상품정보(page.request, params.productId);
    const 색상 = 정보.colors[0] ?? '';
    const 사이즈 = 정보.sizes[0] ?? '';

    await test.step('새로 가입한 회원의 장바구니에 상품을 하나 담는다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      await 장바구니담기(page.request, params.productId, 1, 색상, 사이즈);
    });

    await test.step('장바구니에 상품이 하나 담겨 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 장바구니에 상품이 하나 담겨 있다', (await 장바구니목록(page.request)).length, 1, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      const 줄 = 장바구니.줄(정보.name);
      const 부분 = [
        ['이미지', 장바구니.줄이미지(줄)],
        ['상품명', 장바구니.줄상품명(줄)],
        ['옵션', 장바구니.옵션글(줄, `${색상} / ${사이즈}`)],
        ['수량', 장바구니.줄수량칸(줄)],
        ['금액', 장바구니.줄금액(줄)],
      ] as const;
      const 보이는 = [];
      for (const [이름, 요소] of 부분) if (await 요소.isVisible()) 보이는.push(이름);
      await verify('장바구니 줄에 이미지 · 상품명 · 옵션 · 수량 · 금액이 보인다', 보이는.join(' · '), '이미지 · 상품명 · 옵션 · 수량 · 금액');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
