import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-080',
  name: '아이디와 비밀번호 칸이 모두 비어 있으면 「로그인」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('로그인 화면에서 두 칸을 모두 비워 둔다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('아이디와 비밀번호 칸이 모두 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인.isEnabled(), false);
  });

  await test.step('로그인 화면에서 아이디만 적는다', async () => {
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.아이디.fill('user2');
    await verify('아이디만 적으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인.isEnabled(), false);
  });

  await test.step('로그인 화면에서 비밀번호만 적는다', async () => {
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.비밀번호.fill('Abc1234!');
    await verify('비밀번호만 적으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인.isEnabled(), false);
  });
});
