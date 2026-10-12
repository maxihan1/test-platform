import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-289',
  name: '비회원이 부른 공지 팝업 설정 조회는 200 으로 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/settings 를 부른다', async () => {
    const res = await request.get('/api/settings');
    await verify('비회원이 부른 공지 팝업 설정 조회는 200 으로 응답한다', res.status(), 200);
  });
});
