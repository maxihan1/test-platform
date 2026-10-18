import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-236',
  name: '수량 칸에 0을 넣으면 수량이 1로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아니고 재고가 10개를 넘는 상품').default(8),
    lastProductId: z.number().describe('재고가 1개인 상품 번호').default(12),
    belowMin: z.number().describe('최소 수량보다 하나 작은 수').default(0),
    min: z.number().describe('최소 수량').default(1),
    max: z.number().describe('재고가 넉넉할 때 최대 수량').default(10),
    aboveMax: z.number().describe('최대 수량보다 하나 큰 수').default(11),
    aboveStock: z.number().describe('재고가 1개인 상품에 넣을 수량').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('수량 칸에 0을 넣는다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.수량넣기(params.belowMin);
    await verify('수량 칸에 0을 넣으면 수량이 1로 바뀐다', await 상세.수량칸.inputValue(), '1');
  });

  await test.step('수량 칸에 1을 넣는다', async () => {
    await 상세.수량넣기(params.min);
    await verify('수량 칸에 1을 넣으면 수량이 1로 남는다', await 상세.수량칸.inputValue(), '1');
  });

  await test.step('재고가 10개를 넘는 상품의 수량 칸에 10을 넣는다', async () => {
    await 상세.수량넣기(params.max);
    await verify('재고가 넉넉한 상품의 수량 칸에 10을 넣으면 수량이 10으로 남는다', await 상세.수량칸.inputValue(), '10');
  });

  await test.step('재고가 10개를 넘는 상품의 수량 칸에 11을 넣는다', async () => {
    await 상세.수량넣기(params.aboveMax);
    await verify('재고가 넉넉한 상품의 수량 칸에 11을 넣으면 수량이 10으로 바뀐다', await 상세.수량칸.inputValue(), '10');
  });

  await test.step('재고가 1개인 상품의 수량 칸에 2를 넣는다', async () => {
    await 상세.열기(params.lastProductId);
    await verify('재고가 1개인 상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.수량넣기(params.aboveStock);
    await verify('재고가 1개인 상품의 수량 칸에 2를 넣으면 수량이 1로 바뀐다', await 상세.수량칸.inputValue(), '1');
  });
});
