import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-312',
  name: '로그인 없이 GET /api/coupons 를 부르면 401 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(request)) === null, true, { blocker: true });
  });

  await test.step('GET /api/coupons 를 부른다', async () => {
    const 응답 = await request.get('/api/coupons');
    await verify('로그인 없이 GET /api/coupons 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
