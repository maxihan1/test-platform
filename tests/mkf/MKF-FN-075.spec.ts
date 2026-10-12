import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 새회원정보, 탈퇴, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-075',
  name: '탈퇴한 아이디로 로그인하면 로그인되지 않고 로그인 화면에 머문다',
  precondition: ['탈퇴한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만들어 탈퇴시킨다', async () => {
      await 회원가입(page.request, 정보);
      await API로그인(page.request, 정보.loginId, 정보.password);
      await 탈퇴(page.request);
    });

    await test.step('탈퇴한 회원인지 확인한다', async () => {
      const 응답 = await page.request.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 정보.password, remember: false } });
      await verify('탈퇴한 아이디로 API 로그인을 하면 실패한다', 응답.ok(), false, { blocker: true });
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('탈퇴한 아이디와 그 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 로그인.오류.waitFor();
      await verify(
        '탈퇴한 아이디로 로그인하면 로그인되지 않고 로그인 화면에 머문다',
        { 로그인한회원: await 세션아이디(page), 화면: 경로(page) },
        { 로그인한회원: null, 화면: 로그인화면.주소 },
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
