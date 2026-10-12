import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-286',
  name: '로그인 응답이 준 쿠키로 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(request, 정보);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('POST /api/auth/login 으로 로그인한 뒤 받은 쿠키로 GET /api/auth/me 를 부른다', async () => {
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 정보.password, remember: false } });
      await verify('POST /api/auth/login 응답 코드가 200 이다', 로그인.status(), 200, { blocker: true });
      const 응답 = await request.get('/api/auth/me');
      const 본문 = (await 응답.json()) as { loginId?: string };
      await verify('로그인 응답이 준 쿠키로 GET /api/auth/me 를 부르면 로그인한 회원 아이디가 돌아온다', 본문.loginId, 정보.loginId);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
