import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 경로, 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-064',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈으로 가고 머리글에 「로그아웃」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 아이디가 이미 쓰이고 있다', await 아이디쓰이나(page.request, 정보.loginId), true, { blocker: true });
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 요청세션아이디(page.request), null, { blocker: true });
    });

    await test.step('로그인 화면에서 회원 아이디와 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 머리.로그아웃.waitFor();
      await verify(
        '맞는 아이디와 비밀번호로 로그인하면 홈으로 가고 머리글에 「로그아웃」이 보인다',
        { 화면: 경로(page), 로그아웃: await 머리.로그아웃.isVisible() },
        { 화면: '/', 로그아웃: true },
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
