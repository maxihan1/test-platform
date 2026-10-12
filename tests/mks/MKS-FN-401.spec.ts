import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-401',
  name: '아이디만 적으면 「로그인」 버튼이 비활성이다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('로그인 화면을 연다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
  });

  await test.step('로그인 화면에서 아이디만 적는다', async () => {
    await 로그인.적기(로그인.아이디, 'example1');
    await verify('아이디만 적으면 「로그인」 버튼이 비활성이다', await 로그인.로그인.isEnabled(), false);
  });

  await test.step('로그인 화면에서 비밀번호만 적는다', async () => {
    await 로그인.적기(로그인.아이디, '');
    await 로그인.적기(로그인.비밀번호, 'Example1!');
    await verify('비밀번호만 적으면 「로그인」 버튼이 비활성이다', await 로그인.로그인.isEnabled(), false);
  });
});
