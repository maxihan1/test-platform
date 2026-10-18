import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-212',
  name: '최대 가격을 150,000원으로 옮기면 슬라이더 옆에 「~ 150,000원」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    maxPrice: z.number().describe('슬라이더에 둘 최대 가격(원) — 0부터 500,000까지 10,000 단위').default(150000),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('최대 가격 슬라이더를 150,000원으로 옮긴다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격정하기(params.maxPrice);
    await verify('최대 가격을 150,000원으로 옮기면 슬라이더 옆에 「~ 150,000원」이 보인다', await 목록.가격표시.innerText(), `~ ${params.maxPrice.toLocaleString('ko-KR')}원`);
  });
});
