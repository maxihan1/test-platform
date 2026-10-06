import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-457',
  name: '상품 상세는 이미지 · 옵션 · 재고 · 문의 칸으로 응답한다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('상품 상세 /api/products/1 을 부른다', async () => {
    const res = await request.get('/api/products/1');
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const 본문 = (await res.json()) as Record<string, unknown>;
    const 있는칸 = [
      ['이미지', 'images' in 본문],
      ['옵션', 'colors' in 본문 && 'sizes' in 본문],
      ['재고', 'stock' in 본문],
      ['문의', 'qna' in 본문],
    ]
      .filter(([, 있음]) => 있음)
      .map(([이름]) => 이름);
    await verify('상품 상세는 이미지 · 옵션 · 재고 · 문의 칸으로 응답한다', 있는칸.join(' · '), '이미지 · 옵션 · 재고 · 문의');
  });
});
