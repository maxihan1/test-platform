import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-180',
  name: '수량 칸에 「−」 · 「+」 버튼과 숫자 칸이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('상품 상세의 수량 칸을 확인한다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    const 부분 = [
      ['−', 상세.수량줄이기],
      ['+', 상세.수량늘리기],
      ['숫자 칸', 상세.수량칸],
    ] as const;
    const 보이는 = [];
    for (const [이름, 요소] of 부분) if (await 요소.isVisible()) 보이는.push(이름);
    await verify('수량 칸에 「−」 · 「+」 버튼과 숫자 칸이 보인다', 보이는.join(' · '), '− · + · 숫자 칸');
  });
});
