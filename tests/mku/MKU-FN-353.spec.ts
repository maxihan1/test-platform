import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKU-FN-353',
  name: 'GET /api/event-strip 은 띠 문구 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/event-strip 을 부른다', async () => {
    const res = await request.get('/api/event-strip');
    const 본문 = (await res.json()) as { message?: string };
    await verify('GET /api/event-strip 은 띠 문구 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다', 본문.message, '🎉 가을 맞이 전 상품 무료 배송');
  });
});
