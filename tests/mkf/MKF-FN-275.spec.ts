import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-275',
  name: '비회원이 부른 세션 조회는 401 이 아니라 200 이고 user 가 null 이다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/session 을 부른다', async () => {
    const res = await request.get('/api/session');
    const 본문 = (await res.json()) as { user?: unknown };
    await verify('비회원이 부른 세션 조회는 401 이 아니라 200 이고 user 가 null 이다', { 상태: res.status(), user: 본문.user }, { 상태: 200, user: null });
  });
});
