import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-306',
  name: 'category=패션,도서 로 부르면 두 카테고리 상품만 돌아온다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  await test.step('GET /api/products?category=패션,도서 를 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { category: '패션,도서' } });
    await verify('GET /api/products 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { category: string }[] };
    await verify('category=패션,도서 로 부르면 두 카테고리 상품만 돌아온다', items.length > 0 && items.every((상품) => ['패션', '도서'].includes(상품.category)), true);
  });

  await test.step('GET /api/products?maxPrice=50000 을 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { maxPrice: '50000' } });
    await verify('GET /api/products 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { salePrice: number }[] };
    await verify('maxPrice=50000 으로 부르면 판매가 50,000원 넘는 상품이 돌아오지 않는다', items.length > 0 && items.every((상품) => 상품.salePrice <= 50000), true);
  });

  await test.step('GET /api/products?excludeSoldOut=true 를 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { excludeSoldOut: 'true' } });
    await verify('GET /api/products 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { soldOut: boolean }[] };
    await verify('excludeSoldOut=true 로 부르면 품절 상품이 돌아오지 않는다', items.length > 0 && items.every((상품) => !상품.soldOut), true);
  });

  await test.step('GET /api/products?sort=priceAsc 를 부른다', async () => {
    const 응답 = await request.get('/api/products', { params: { sort: 'priceAsc' } });
    await verify('GET /api/products 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { salePrice: number }[] };
    await verify('sort=priceAsc 로 부르면 판매가가 낮은 순으로 돌아온다', items.length > 0 && items.every((상품, 번) => 번 === 0 || (items[번 - 1]?.salePrice ?? 0) <= 상품.salePrice), true);
  });
});
