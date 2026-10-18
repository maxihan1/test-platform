import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 리뷰응답앞에서실패시키기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-531',
  name: '「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['첫 리뷰 응답만 가짜 실패 응답(모킹)이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 리뷰가 하나 이상 있는 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 거두기 = await 리뷰응답앞에서실패시키기(page, 1);

  try {
    await test.step('첫 리뷰 응답을 실패시키고 리뷰 탭을 누른다', async () => {
      await 방해창막기(page);
      await 상세.열기(params.productId);
      await 상세.리뷰탭.click();
      await 상세.리뷰실패문구.waitFor();
    });

    await test.step('리뷰를 불러오지 못했는지 확인한다', async () => {
      await verify('리뷰를 불러오지 못해 「다시 시도」 버튼이 보인다', await 상세.다시시도.isVisible(), true, { blocker: true });
    });

    await test.step('리뷰 불러오기 실패 뒤 「다시 시도」를 누른다', async () => {
      await 상세.다시시도.click();
      await 상세.리뷰들.first().waitFor();
      const 개수 = await 상세.리뷰개수읽기();
      await verify('「다시 시도」를 누르면 리뷰를 다시 불러와 리뷰 목록이 보인다', `리뷰 ${await 상세.리뷰들.count()}개`, `리뷰 ${개수}개`);
    });
  } finally {
    await 거두기();
  }
});
