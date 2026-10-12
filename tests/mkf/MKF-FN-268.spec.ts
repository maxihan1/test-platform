import { defineCase, test, verify } from '@platform/kit';

import { API로그아웃, API로그인, 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-268',
  name: '틀린 비밀번호로 로그인을 부르면 401 로 응답한다',
  precondition: ['새로 가입한 회원이 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 정보 = 새회원정보();
  const 틀린본문 = { loginId: 정보.loginId, password: 'Wrong1234!', remember: false };

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      const res = await request.get('/api/auth/check-id', { params: { loginId: 정보.loginId } });
      const 본문 = (await res.json()) as { available?: boolean };
      await verify('새로 가입한 회원이 있다', 본문.available, false, { blocker: true });
    });

    await test.step('그 회원의 아이디와 틀린 비밀번호로 POST /api/auth/login 을 부른다', async () => {
      const res = await request.post('/api/auth/login', { data: 틀린본문 });
      await verify('틀린 비밀번호로 로그인을 부르면 401 로 응답한다', res.status(), 401);
    });

    await test.step('맞는 비밀번호로 로그인해 실패 횟수를 되돌린다', async () => {
      await API로그인(request, 정보.loginId, 정보.password);
      await API로그아웃(request);
    });

    await test.step('실패 횟수가 되돌려졌는지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
    });

    await test.step('틀린 비밀번호로 5번 부른 뒤 맞는 비밀번호로 POST /api/auth/login 을 부른다', async () => {
      for (let 번째 = 0; 번째 < 5; 번째 += 1) await request.post('/api/auth/login', { data: 틀린본문 });
      const res = await request.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 정보.password, remember: false } });
      const 코드 = ((await res.json()) as { code?: string }).code;
      await verify('잠긴 회원이 로그인을 부르면 423 LOCKED 로 응답한다', { 상태: res.status(), 코드 }, { 상태: 423, 코드: 'LOCKED' });
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
