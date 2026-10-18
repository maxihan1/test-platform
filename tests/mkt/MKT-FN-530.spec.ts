import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 리뷰응답앞에서실패시키기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-530',
  name: '리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['리뷰 응답은 가짜 응답(모킹)이다'],
  techniques: ['동등 분할'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 거두기 = await 리뷰응답앞에서실패시키기(page, Number.POSITIVE_INFINITY);

  try {
    await test.step('리뷰 응답이 실패하도록 두고 리뷰 탭을 누른다', async () => {
      await 방해창막기(page);
      await 상세.열기(params.productId);
      await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
      await 상세.리뷰탭.click();
      await 상세.리뷰실패문구.waitFor();
      await verify('리뷰를 불러오지 못하면 「리뷰를 불러오지 못했습니다」와 「다시 시도」 버튼이 보인다', [await 상세.리뷰실패문구.isVisible(), await 상세.다시시도.isVisible()], [true, true]);
    });
  } finally {
    await 거두기();
  }
});
