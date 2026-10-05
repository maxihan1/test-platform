import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-460',
  name: '리뷰 목록 조회는 「items」로 응답한다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('상품 1의 리뷰 목록을 500 이 아닐 때까지 다섯 번 안에서 부른다', async () => {
    let 응답 = await request.get('/api/products/1/reviews');
    for (let 번 = 1; 번 < 5 && 응답.status() === 500; 번 += 1) 응답 = await request.get('/api/products/1/reviews');
    await verify('다섯 번 안에 500 이 아닌 응답이 온다', 응답.status() !== 500, true, { blocker: true });
    const 본문 = (await 응답.json()) as { items?: unknown };
    await verify('리뷰 목록 조회는 「items」로 응답한다', Array.isArray(본문.items), true);
  });
});
