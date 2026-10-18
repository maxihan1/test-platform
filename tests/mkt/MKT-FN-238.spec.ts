import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-238',
  name: '수량을 2로 바꾸면 「총 상품 금액」이 판매가의 두 배로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아니고 재고가 10개를 넘는 상품').default(2),
    quantity: z.number().describe('바꿀 수량 — 1부터 10까지').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('수량을 2로 바꾼다', async () => {
    await 방해창막기(page);
    const 판매가 = (await 상품정보(page.request, params.productId)).salePrice;
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.수량넣기(params.quantity);
    await verify('수량을 2로 바꾸면 「총 상품 금액」이 판매가의 두 배로 바뀐다', await 상세.총상품금액.innerText(), `총 상품 금액 ${(판매가 * params.quantity).toLocaleString('ko-KR')}원`);
  });
});
