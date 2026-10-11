import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 맞는이름들, 검색어고르기 } from './helpers/shop-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-310',
  name: '맞는 상품이 6개 넘는 검색어로 부르면 자동완성이 5개 돌아온다',
  techniques: ['경계값 분석'],
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  const 상품들 = (await 상품목록(request)).items;

  await test.step('맞는 상품이 6개 넘는 검색어로 GET /api/products/suggest 를 부른다', async () => {
    const 응답 = await request.get('/api/products/suggest', { params: { q: 검색어고르기(상품들, { 이상: 6 }) } });
    await verify('GET /api/products/suggest 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { name: string }[] };
    await verify('맞는 상품이 6개 넘는 검색어로 부르면 자동완성이 5개 돌아온다', items.length, 5);
  });

  await test.step('맞는 상품이 5개 이하인 검색어로 GET /api/products/suggest 를 부른다', async () => {
    const 검색어 = 검색어고르기(상품들, { 이하: 5 });
    const 응답 = await request.get('/api/products/suggest', { params: { q: 검색어 } });
    await verify('GET /api/products/suggest 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const { items } = (await 응답.json()) as { items: { name: string }[] };
    await verify('맞는 상품이 5개 이하인 검색어로 부르면 맞는 상품이 모두 돌아온다', items.map((상품) => 상품.name).sort(), 맞는이름들(상품들, 검색어).sort());
  });
});
