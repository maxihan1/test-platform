import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-554',
  name: '맞는 상품이 5개면 자동완성 응답 items 가 5건이다',
  precondition: ['비회원이다'],
  held: '보류 — 맞는 상품이 정확히 5개인 검색어가 현재 상품 이름에 없다(같은 글자가 든 상품이 4개 아니면 6개 이상이다)',
  techniques: ['경계값 분석'],
  params: z.object({
    q5: z.string().describe('맞는 상품이 5개인 검색어'),
  }),
  expected: z.object({}),
});

test(spec, async ({ request, params }) => {
  await test.step('자동완성을 맞는 상품이 5개인 q 로 부른다', async () => {
    const res = await request.get('/api/products/suggest', { params: { q: params.q5 } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: unknown[] };
    await verify('맞는 상품이 5개면 자동완성 응답 items 가 5건이다', items.length, 5);
  });
});
