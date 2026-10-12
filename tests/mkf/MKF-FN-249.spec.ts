import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-249',
  name: '비회원이 부른 상품 목록 조회는 200 으로 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/products?category=패션&sort=priceAsc 를 부른다', async () => {
    const res = await request.get('/api/products', { params: { category: '패션', sort: 'priceAsc' } });
    await verify('비회원이 부른 상품 목록 조회는 200 으로 응답한다', res.status(), 200);
  });

  await test.step('비회원으로 GET /api/products?category=패션&sort=priceAsc 를 부르고 items 를 확인한다', async () => {
    const res = await request.get('/api/products', { params: { category: '패션', sort: 'priceAsc' } });
    const { items } = (await res.json()) as { items: { category: string; salePrice: number }[] };
    const 모두패션 = items.length > 0 && items.every((상품) => 상품.category === '패션');
    const 낮은순 = items.every((상품, 번째) => 번째 === 0 || (items[번째 - 1]?.salePrice ?? 0) <= 상품.salePrice);
    await verify('category=패션 · sort=priceAsc 상품 목록은 모두 패션이고 가격 낮은 순이다', 모두패션 && 낮은순, true);
  });
});
