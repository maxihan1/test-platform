import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-302',
  name: '로그인한 채 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다',
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
      const res = await request.get('/api/session');
      const body = (await res.json()) as { user: { loginId: string } | null };
      await verify('세션에 로그인한 회원이 있다', body.user !== null, true, { blocker: true });
    });

    await test.step('GET /api/auth/me 를 부른다', async () => {
      const res = await request.get('/api/auth/me');
      await verify('GET /api/auth/me 응답 코드가 200 이다', res.status(), 200, { blocker: true });
      const body = (await res.json()) as { loginId?: string };
      await verify('로그인한 채 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다', body.loginId === 정보?.loginId, true);
    });
  } finally {
    if (정보 !== undefined) await 가입자정리하기(request, 정보);
  }
});
