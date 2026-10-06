import { defineCase, test, verify } from '@platform/kit';

import { 자동완성글자 } from './components/board-helpers.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-464',
  name: '맞는 상품이 6개 넘어도 자동완성 응답 items 는 5건이다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('자동완성을 맞는 상품이 6개 넘는 q 로 부른다', async () => {
    const 글 = await 자동완성글자(request, (개수) => 개수 > 6);
    const res = await request.get('/api/products/suggest', { params: { q: 글 } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: unknown[] };
    await verify('맞는 상품이 6개 넘어도 자동완성 응답 items 는 5건이다', items.length, 5);
  });
});
