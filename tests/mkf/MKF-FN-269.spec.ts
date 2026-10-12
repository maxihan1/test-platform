import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-269',
  name: '로그인한 회원이 로그아웃을 부르면 204 로 응답한다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('회원으로 로그인해 있는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 요청세션아이디(request), 정보.loginId, { blocker: true });
    });

    await test.step('POST /api/auth/logout 을 부른다', async () => {
      const res = await request.post('/api/auth/logout');
      await verify('로그인한 회원이 로그아웃을 부르면 204 로 응답한다', res.status(), 204);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
