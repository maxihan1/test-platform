import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-182',
  name: '수량이 최소 1이면 「−」가 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아니고 재고가 10개를 넘는 상품').default(8),
    maxQuantity: z.number().describe('수량을 올릴 숫자 — 재고와 10 가운데 작은 수').default(10),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('수량이 1일 때 「−」를 확인한다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await verify('수량이 최소 1이면 「−」가 눌리지 않는다', await 상세.수량줄이기.isDisabled(), true);
  });

  await test.step('수량을 10으로 올린 뒤 「+」를 확인한다', async () => {
    await 상세.수량올리기(params.maxQuantity);
    await verify('수량이 최대면 「+」가 눌리지 않는다', await 상세.수량늘리기.isDisabled(), true);
  });
});
