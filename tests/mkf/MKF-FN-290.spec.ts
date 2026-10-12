import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-290',
  name: '일반 회원이 공지 팝업 설정 변경을 부르면 403 으로 응답한다',
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
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

    await test.step('일반 회원으로 PUT /api/admin/settings 를 부른다', async () => {
      const 현재 = (await (await request.get('/api/settings')).json()) as { noticePopup: boolean };
      const res = await request.put('/api/admin/settings', { data: { noticePopup: 현재.noticePopup } });
      await verify('일반 회원이 공지 팝업 설정 변경을 부르면 403 으로 응답한다', res.status(), 403);
    });
  } finally {
    await 탈퇴(request);
  }
});
