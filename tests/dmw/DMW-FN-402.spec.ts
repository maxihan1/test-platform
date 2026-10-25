import { defineCase, test, verify } from '@platform/kit';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-402',
  name: '이벤트 띠 API 는 「🎉 가을 맞이 전 상품 무료 배송」 문구를 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/event-strip 을 부른다', async () => {
    const 몸 = await 몸읽기<{ message?: string }>(await request.get('/api/event-strip'));
    await verify('이벤트 띠 API 는 「🎉 가을 맞이 전 상품 무료 배송」 문구를 돌려준다', 몸.message, '🎉 가을 맞이 전 상품 무료 배송');
  });
});
