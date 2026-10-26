import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DMW-FN-374',
  name: '로그인 없이 쿠폰 목록 API 를 부르면 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('로그인 없이 GET /api/coupons 를 부른다', async () => {
    const 응답 = await request.get('/api/coupons');
    await verify('로그인 없이 쿠폰 목록 API 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
