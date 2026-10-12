import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-292',
  name: '이벤트 띠 문구 조회는 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/event-strip 을 부른다', async () => {
    const res = await request.get('/api/event-strip');
    const 본문 = (await res.json()) as { message?: string };
    await verify('이벤트 띠 문구 조회는 「🎉 가을 맞이 전 상품 무료 배송」을 돌려준다', 본문.message, '🎉 가을 맞이 전 상품 무료 배송');
  });
});
