import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-304',
  name: '맞는 아이디와 이메일로 POST /api/auth/find-password 를 보내면 200 으로 응답한다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();

  try {
    await test.step('회원을 가입시킨다', async () => {
      await 회원가입(request, 정보);
    });

    await test.step('가입한 회원이 있는지 확인한다', async () => {
      const 응답 = await request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('가입한 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('맞는 아이디와 이메일로 POST /api/auth/find-password 를 보낸다', async () => {
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 정보.loginId, email: 정보.email } });
      await verify('맞는 아이디와 이메일로 POST /api/auth/find-password 를 보내면 200 으로 응답한다', 응답.status(), 200);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
