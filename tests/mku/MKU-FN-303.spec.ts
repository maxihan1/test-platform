import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-303',
  name: '로그인 없이 GET /api/auth/me 를 부르면 401 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/auth/me 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/me');
    await verify('로그인 없이 GET /api/auth/me 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
