import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인, 새회원정보, 탈퇴, 회원가입, type 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-254',
  name: '탈퇴한 아이디로 로그인하면 로그인되지 않는다',
  precondition: ['새로 가입한 회원이 탈퇴했다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인화면(page);
  const 정보: 회원정보 = 새회원정보();

  try {
    await test.step('임시 회원으로 가입해 탈퇴한다', async () => {
      await 방해막기(page);
      await 회원가입(request, 정보);
      await API로그인(request, 정보.loginId, 정보.password);
      await 탈퇴(request);
    });

    await test.step('탈퇴한 회원인지 확인한다', async () => {
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 정보.password, remember: false } });
      await verify('탈퇴한 아이디로 API 로그인을 하면 실패한다', 응답.ok(), false, { blocker: true });
    });

    await test.step('탈퇴한 아이디로 로그인한다', async () => {
      await 로그인.열기();
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 로그인.오류.waitFor();
      await verify('탈퇴한 아이디로 로그인하면 로그인되지 않는다', await 머리.로그아웃.isVisible(), false);
    });
  } finally {
    await 가입자정리하기(request, 정보);
  }
});
