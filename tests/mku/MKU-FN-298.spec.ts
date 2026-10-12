import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-298',
  name: '맞는 아이디와 비밀번호로 POST /api/auth/login 을 보내면 200 으로 응답한다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 계정 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(request, 계정);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await request.get(`/api/auth/check-id?loginId=${계정.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('로그인하지 않은 요청인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('맞는 아이디와 비밀번호로 POST /api/auth/login 을 보낸다', async () => {
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 계정.loginId, password: 계정.password, remember: false } });
      await verify('맞는 아이디와 비밀번호로 POST /api/auth/login 을 보내면 200 으로 응답한다', 응답.status(), 200);
    });
  } finally {
    await 가입자정리하기(request, 계정);
  }
});
