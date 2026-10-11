import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-149',
  name: '이벤트 띠 문구를 요청하면 「🎉 가을 맞이 전 상품 무료 배송」 이 온다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('이벤트 띠 문구 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/event-strip');
    await verify('응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 본문 = (await 응답.json()) as { message?: string };
    await verify('이벤트 띠 문구를 요청하면 「🎉 가을 맞이 전 상품 무료 배송」 이 온다', 본문.message, '🎉 가을 맞이 전 상품 무료 배송');
  });
});
