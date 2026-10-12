import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 검색어고르기, 맞는이름들 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-252',
  name: '맞는 상품이 6개 넘어도 자동완성 응답은 5개다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  const 상품들 = (await 상품목록(request)).items;

  await test.step('맞는 상품이 6개 넘는 검색어로 GET /api/products/suggest 를 부른다', async () => {
    const res = await request.get('/api/products/suggest', { params: { q: 검색어고르기(상품들, { 이상: 6 }) } });
    await verify('GET /api/products/suggest 응답 코드가 200 이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: unknown[] };
    await verify('맞는 상품이 6개 넘어도 자동완성 응답은 5개다', items.length, 5);
  });

  await test.step('맞는 상품이 5개 이하인 검색어로 GET /api/products/suggest 를 부른다', async () => {
    const 검색어 = 검색어고르기(상품들, { 이하: 5 });
    const res = await request.get('/api/products/suggest', { params: { q: 검색어 } });
    await verify('5개 이하 검색어로 부른 자동완성 응답 코드가 200 이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: unknown[] };
    await verify('맞는 상품이 5개 이하면 자동완성 응답은 맞는 상품 수만큼이다', items.length, 맞는이름들(상품들, 검색어).length);
  });
});
