import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-505',
  name: '이벤트 띠 조회는 문구 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('이벤트 띠 /api/event-strip 을 부른다', async () => {
    await verify('비회원이다', (await request.get('/api/auth/me')).status(), 401, { blocker: true });
    const 응답 = await request.get('/api/event-strip');
    const 본문 = (await 응답.json()) as { message?: string };
    await verify('이벤트 띠 조회는 문구 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다', [응답.status(), 본문.message], [200, '🎉 가을 맞이 전 상품 무료 배송']);
  });
});
