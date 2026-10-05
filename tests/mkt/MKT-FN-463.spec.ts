import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-463',
  name: '자동완성은 이름에 「니트」가 든 상품만 돌려준다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('자동완성 /api/products/suggest 를 q=니트 로 부른다', async () => {
    const res = await request.get('/api/products/suggest', { params: { q: '니트' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: Array<{ name: string }> };
    await verify('자동완성은 이름에 「니트」가 든 상품만 돌려준다', items.length > 0 && items.every((상품) => 상품.name.includes('니트')), true);
  });
});
