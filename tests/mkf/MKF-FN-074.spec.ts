import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-074',
  name: '비밀번호 칸에서 Enter 를 치면 로그인되어 홈으로 간다',
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
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('로그인 화면에서 회원 아이디와 비밀번호를 적고 비밀번호 칸에서 Enter 를 친다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.아이디.fill(정보.loginId);
      await 로그인.비밀번호.fill(정보.password);
      await 로그인.비밀번호.press('Enter');
      await 머리.로그아웃.waitFor();
      await verify('비밀번호 칸에서 Enter 를 치면 로그인되어 홈으로 간다', { 로그인됨: (await 세션아이디(page)) === 정보.loginId, 화면: 경로(page) }, { 로그인됨: true, 화면: '/' });
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
