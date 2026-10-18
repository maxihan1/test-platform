import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-402',
  name: '상품 목록 요청에 category 둘을 쉼표로 주면 그 카테고리 상품만 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    카테고리: z.string().min(1).describe('카테고리 둘 — 쉼표로 이음, 패션·전자기기·도서·식품 중').default('도서,식품'),
    최대가격: z.number().int().min(0).describe('최대 가격(원) — 이 가격 이하 상품이 하나 이상 있는 값').default(100000),
  }),
  expected: null,
});

type 상품 = { category: string; salePrice: number; soldOut: boolean };

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/products?category=도서,식품 을 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { category: params.카테고리 } });
    const 상품들 = ((await 응답.json()) as { items: 상품[] }).items;
    const 허용 = params.카테고리.split(',');
    await verify(
      '상품 목록 요청에 category 둘을 쉼표로 주면 그 카테고리 상품만 준다',
      { 하나이상: 상품들.length > 0, 모두그카테고리: 상품들.every((한상품) => 허용.includes(한상품.category)) },
      { 하나이상: true, 모두그카테고리: true },
    );
  });

  await test.step('maxPrice=100000 으로 상품 목록을 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { maxPrice: params.최대가격 } });
    const 상품들 = ((await 응답.json()) as { items: 상품[] }).items;
    await verify(
      '상품 목록 요청에 maxPrice 를 주면 그 가격 이하 상품만 준다',
      { 하나이상: 상품들.length > 0, 모두그가격이하: 상품들.every((한상품) => 한상품.salePrice <= params.최대가격) },
      { 하나이상: true, 모두그가격이하: true },
    );
  });

  await test.step('excludeSoldOut=true 로 상품 목록을 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { excludeSoldOut: 'true' } });
    const 상품들 = ((await 응답.json()) as { items: 상품[] }).items;
    await verify(
      '상품 목록 요청에 excludeSoldOut 을 주면 품절 상품을 빼고 준다',
      { 하나이상: 상품들.length > 0, 품절없음: 상품들.every((한상품) => !한상품.soldOut) },
      { 하나이상: true, 품절없음: true },
    );
  });

  await test.step('sort=priceAsc 로 상품 목록을 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { sort: 'priceAsc' } });
    const 가격들 = ((await 응답.json()) as { items: 상품[] }).items.map((한상품) => 한상품.salePrice);
    await verify(
      '상품 목록 요청에 sort=priceAsc 를 주면 가격 낮은 순으로 준다',
      { 두건이상: 가격들.length >= 2, 낮은순: 가격들.every((가격, i) => i === 0 || (가격들[i - 1] ?? 0) <= 가격) },
      { 두건이상: true, 낮은순: true },
    );
  });
});
