import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-267',
  name: '맞는 아이디와 비밀번호로 로그인을 부르면 200 으로 응답한다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();

  try {
    await test.step('로그인할 회원을 가입시킨다', async () => {
      await 회원가입(request, 정보);
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('회원 아이디와 비밀번호로 POST /api/auth/login 을 부른다', async () => {
      const res = await request.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 정보.password, remember: false } });
      await verify('맞는 아이디와 비밀번호로 로그인을 부르면 200 으로 응답한다', res.status(), 200);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
