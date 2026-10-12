import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-323',
  name: 'GET /api/products/suggest 는 검색어에 맞는 상품 이름을 돌려준다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  await test.step('GET /api/products/suggest?q=<검색어> 를 부른다', async () => {
    const 응답 = await request.get('/api/products/suggest', { params: { q: '데모' } });
    await verify('GET /api/products/suggest 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { name: string }[] };
    await verify('GET /api/products/suggest 는 검색어에 맞는 상품 이름을 돌려준다', items.length > 0 && items.every((상품) => 상품.name.includes('데모')), true);
  });
});
