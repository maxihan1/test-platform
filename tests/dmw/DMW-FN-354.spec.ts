import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-354',
  name: '로그인 없이 GET /api/auth/me 를 부르면 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('로그인 없이 GET /api/auth/me 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/me');
    await verify('로그인 없이 GET /api/auth/me 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
