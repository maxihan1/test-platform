import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-441',
  name: '이벤트 띠 요청은 띠 문구 「🎉 가을 맞이 전 상품 무료 배송」을 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/event-strip 을 부른다', async () => {
    const 응답 = await request.get('/api/event-strip');
    await verify('이벤트 띠 요청은 띠 문구 「🎉 가을 맞이 전 상품 무료 배송」을 준다', ((await 응답.json()) as { message: string }).message, '🎉 가을 맞이 전 상품 무료 배송');
  });
});
