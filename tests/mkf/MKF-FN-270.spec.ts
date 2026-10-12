import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-270',
  name: '비회원이 로그아웃을 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 POST /api/auth/logout 을 부른다', async () => {
    const res = await request.post('/api/auth/logout');
    await verify('비회원이 로그아웃을 부르면 401 로 응답한다', res.status(), 401);
  });
});
