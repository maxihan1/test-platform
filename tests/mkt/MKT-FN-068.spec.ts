import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { salePrice: number };

export const spec = defineCase({
  tcId: 'MKT-FN-068',
  name: '정렬을 「낮은 가격순」으로 바꾸면 싼 상품이 먼저, 「높은 가격순」으로 바꾸면 비싼 상품이 먼저 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 낮은순 = 전체.map((상품) => 상품.salePrice).sort((가, 나) => 가 - 나).slice(0, 12);
  const 높은순 = 전체.map((상품) => 상품.salePrice).sort((가, 나) => 나 - 가).slice(0, 12);
  const 보이는가격들 = async (): Promise<number[]> => (await 목록.카드판매가들().allInnerTexts()).map((글) => Number(글.replace(/\D/g, '')));

  await test.step('정렬을 「낮은 가격순」으로 바꾼다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await 목록.정렬고르기('낮은 가격순');
    await 목록.상품카드들().first().waitFor();
    await verify('「낮은 가격순」을 고르면 가격이 낮은 상품이 먼저 보인다', await 보이는가격들(), 낮은순);
  });

  await test.step('정렬을 「높은 가격순」으로 바꾼다', async () => {
    await 목록.정렬고르기('높은 가격순');
    await 목록.상품카드들().first().waitFor();
    await verify('「높은 가격순」을 고르면 가격이 높은 상품이 먼저 보인다', await 보이는가격들(), 높은순);
  });
});
