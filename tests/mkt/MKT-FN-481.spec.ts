import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-481',
  name: '주소 검색어가 2자 이상이면 주소 목록으로 응답한다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('주소 검색 /api/address 를 q=테헤란 으로 부른다', async () => {
    const res = await request.get('/api/address', { params: { q: '테헤란' } });
    const 본문 = (await res.json()) as { items?: unknown[] };
    await verify(
      '주소 검색어가 2자 이상이면 주소 목록으로 응답한다',
      { 응답: res.status(), 목록: Array.isArray(본문.items) && 본문.items.length > 0 },
      { 응답: 200, 목록: true },
    );
  });
});
