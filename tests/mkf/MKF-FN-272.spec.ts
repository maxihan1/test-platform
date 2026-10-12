import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-272',
  name: '비회원이 현재 회원 조회를 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/auth/me 를 부르고 상태 코드를 확인한다', async () => {
    const res = await request.get('/api/auth/me');
    await verify('비회원이 현재 회원 조회를 부르면 401 로 응답한다', res.status(), 401);
  });
});
