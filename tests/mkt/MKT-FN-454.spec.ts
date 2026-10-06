import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-454',
  name: 'category=패션,도서 면 items 가 모두 패션이나 도서다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

interface 상품줄 {
  category: string;
  salePrice: number;
  soldOut: boolean;
}

test(spec, async ({ request }) => {
  await test.step('상품 목록을 category=패션,도서 로 부른다', async () => {
    const res = await request.get('/api/products', { params: { category: '패션,도서', size: '100' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 상품줄[] };
    await verify('category=패션,도서 면 items 가 모두 패션이나 도서다', items.length > 0 && items.every((상품) => ['패션', '도서'].includes(상품.category)), true);
  });

  await test.step('상품 목록을 maxPrice=150000 으로 부른다', async () => {
    const res = await request.get('/api/products', { params: { maxPrice: '150000', size: '100' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 상품줄[] };
    await verify('maxPrice=150000 이면 items 의 판매가가 모두 150,000원 이하다', items.length > 0 && items.every((상품) => 상품.salePrice <= 150000), true);
  });

  await test.step('상품 목록을 excludeSoldOut=true 로 부른다', async () => {
    const res = await request.get('/api/products', { params: { excludeSoldOut: 'true', size: '100' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 상품줄[] };
    await verify('excludeSoldOut=true 면 품절 상품이 오지 않는다', items.length > 0 && items.every((상품) => !상품.soldOut), true);
  });

  await test.step('상품 목록을 sort=priceAsc 로 부른다', async () => {
    const res = await request.get('/api/products', { params: { sort: 'priceAsc', size: '100' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 상품줄[] };
    const 낮은순 = items.length > 1 && items.every((상품, 자리) => 자리 === 0 || (items[자리 - 1]?.salePrice ?? 0) <= 상품.salePrice);
    await verify('sort=priceAsc 면 판매가 낮은 순으로 온다', 낮은순, true);
  });
});
