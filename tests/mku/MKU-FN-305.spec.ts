import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-305',
  name: '로그인한 채 GET /api/session 을 부르면 user 에 로그인한 회원이 돌아온다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보: 회원정보 | undefined;

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      const 응답 = await request.get('/api/auth/me');
      await verify('GET /api/auth/me 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    });

    await test.step('GET /api/session 을 부른다', async () => {
      const 응답 = await request.get('/api/session');
      const 본문 = (await 응답.json()) as { user: { loginId?: string } | null };
      await verify('로그인한 채 GET /api/session 을 부르면 user 에 로그인한 회원이 돌아온다', 본문.user?.loginId === 정보?.loginId, true);
    });
  } finally {
    if (정보 !== undefined) await 가입자정리하기(request, 정보);
  }
});
