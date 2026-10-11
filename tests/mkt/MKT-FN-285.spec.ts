import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 가입본문, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-285',
  name: '중복 아이디로 POST /api/auth/signup 을 보내면 409 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('이미 있는 아이디 「user2」로 POST /api/auth/signup 을 보낸다', async () => {
    const 응답 = await request.post('/api/auth/signup', { data: 가입본문({ ...새회원정보(), loginId: 'user2' }) });
    await verify('중복 아이디로 POST /api/auth/signup 을 보내면 409 로 응답한다', 응답.status(), 409);
  });
});
