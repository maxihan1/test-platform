import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-274',
  name: '회원이 부른 세션 조회의 user.loginId 는 그 회원 아이디다',
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
      const res = await request.get('/api/auth/me');
      const 본문 = (await res.json()) as { loginId?: string };
      await verify('회원으로 로그인해 있다', 본문.loginId, 정보.loginId, { blocker: true });
    });

    await test.step('GET /api/session 을 부른다', async () => {
      await verify('회원이 부른 세션 조회의 user.loginId 는 그 회원 아이디다', await 요청세션아이디(request), 정보.loginId);
    });
  } finally {
    await 탈퇴(request);
  }
});
