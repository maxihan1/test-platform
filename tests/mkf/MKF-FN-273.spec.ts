import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-273',
  name: '아이디와 이메일이 맞는 비밀번호 찾기 요청은 성공 응답을 준다',
  precondition: ['새로 가입한 회원이 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      const res = await request.get('/api/auth/check-id', { params: { loginId: 정보.loginId } });
      const 본문 = (await res.json()) as { available?: boolean };
      await verify('새로 가입한 회원이 있다', 본문.available, false, { blocker: true });
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('그 회원의 아이디와 이메일로 POST /api/auth/find-password 를 부른다', async () => {
      const res = await request.post('/api/auth/find-password', { data: { loginId: 정보.loginId, email: 정보.email } });
      await verify('아이디와 이메일이 맞는 비밀번호 찾기 요청은 성공 응답을 준다', res.ok(), true);
    });

    await test.step('없는 아이디와 이메일로 POST /api/auth/find-password 를 부른다', async () => {
      const res = await request.post('/api/auth/find-password', { data: { loginId: `${정보.loginId}x`, email: `${정보.loginId}x@example.com` } });
      await verify('아이디와 이메일이 맞지 않는 비밀번호 찾기 요청은 실패 응답을 준다', res.ok(), false);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
