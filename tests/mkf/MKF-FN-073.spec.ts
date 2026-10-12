import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-073',
  name: '아이디만 적으면 「로그인」 버튼이 꺼져 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 정보 = 새회원정보();

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
  });

  await test.step('로그인 화면에서 아이디 칸만 채운다', async () => {
    await 로그인.아이디.fill(정보.loginId);
    await verify('아이디만 적으면 「로그인」 버튼이 꺼져 있다', await 로그인.로그인.isEnabled(), false);
  });

  await test.step('로그인 화면에서 비밀번호 칸만 채운다', async () => {
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.비밀번호.fill(정보.password);
    await verify('비밀번호만 적으면 「로그인」 버튼이 꺼져 있다', await 로그인.로그인.isEnabled(), false);
  });

  await test.step('로그인 화면을 열고 두 칸을 비워 둔다', async () => {
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('두 칸이 비어 있으면 「로그인」 버튼이 꺼져 있다', await 로그인.로그인.isEnabled(), false);
  });
});
