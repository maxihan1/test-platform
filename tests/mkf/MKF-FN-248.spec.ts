import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-248',
  name: '초기화 요청은 204 로 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('POST /api/reset 을 부른다', async () => {
    const res = await request.post('/api/reset');
    await verify('초기화 요청은 204 로 응답한다', res.status(), 204);
  });
});
