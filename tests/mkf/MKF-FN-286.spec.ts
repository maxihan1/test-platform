import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-286',
  name: '일반 회원이 회원 목록을 부르면 403 으로 응답한다',
  precondition: ['회원으로 로그인해 있다', '비회원이다'],
  techniques: ['동등 분할', '상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인해 있고 비회원인 요청이 있는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 요청세션아이디(page.request), 정보.loginId, { blocker: true });
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('일반 회원으로 GET /api/admin/users 를 부르고 code 를 확인한다', async () => {
      const res = await page.request.get('/api/admin/users');
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('일반 회원이 회원 목록을 부르면 403 으로 응답한다', { 상태: res.status(), 코드 }, { 상태: 403, 코드: 'FORBIDDEN' });
    });

    await test.step('일반 회원으로 POST /api/admin/users/1/unlock 을 부른다', async () => {
      const res = await page.request.post('/api/admin/users/1/unlock');
      await verify('일반 회원이 잠금 해제를 부르면 403 으로 응답한다', res.status(), 403);
    });

    await test.step('비회원으로 GET /api/admin/users 를 부른다', async () => {
      const res = await request.get('/api/admin/users');
      await verify('비회원이 회원 목록을 부르면 401 로 응답한다', res.status(), 401);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
