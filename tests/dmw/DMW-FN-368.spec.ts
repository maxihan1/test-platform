import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { 상품 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-368',
  name: 'category 에 쉼표로 둘을 넣으면 두 분류 상품만 온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    두분류: z.string().min(1).describe('상품 분류 둘 — 쉼표로 이은 두 분류 이름').default('패션,도서'),
    최고가: z.number().int().describe('상품 가격 상한(원) — 1,000 이상').default(50000),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 목록 = async (질의: string): Promise<상품[]> => {
    const 응답 = await request.get(`/api/products?${질의}&size=100`);
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    return ((await 응답.json()) as { items: 상품[] }).items;
  };

  await test.step('GET /api/products?category=패션,도서 를 부른다', async () => {
    const 상품들 = await 목록(`category=${encodeURIComponent(params.두분류)}`);
    await verify('category 에 쉼표로 둘을 넣으면 두 분류 상품만 온다', [...new Set(상품들.map((하나) => 하나.category))].sort(), params.두분류.split(',').sort());
  });

  await test.step('GET /api/products?maxPrice=50000 을 부른다', async () => {
    const 상품들 = await 목록(`maxPrice=${params.최고가}`);
    await verify('maxPrice 로 부르면 가격이 그 값 이하인 상품만 온다', 상품들.filter((하나) => 하나.salePrice > params.최고가).map((하나) => 하나.name), []);
  });

  await test.step('GET /api/products?excludeSoldOut=true 를 부른다', async () => {
    const 상품들 = await 목록('excludeSoldOut=true');
    await verify('excludeSoldOut=true 로 부르면 품절 상품이 빠진다', 상품들.filter((하나) => 하나.soldOut).map((하나) => 하나.name), []);
  });

  await test.step('GET /api/products?sort=priceAsc 를 부른다', async () => {
    const 가격들 = (await 목록('sort=priceAsc')).map((하나) => 하나.salePrice);
    await verify('sort=priceAsc 로 부르면 가격이 낮은 순으로 온다', 가격들, [...가격들].sort((앞, 뒤) => 앞 - 뒤));
  });
});
