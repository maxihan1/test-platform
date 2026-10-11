import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-051',
  name: '아이디 중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '결정 테이블'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('다른 칸과 약관을 다 채우고 「중복 확인」만 하지 않는다', async () => {
    await 회원가입.칸채우기(새회원정보());
    await 회원가입.필수약관켜기();
    await verify('아이디 중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('중복 확인을 마친 뒤 아이디 끝에 한 글자를 더 적는다', async () => {
    await 회원가입.중복확인하기();
    await verify('아이디 중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
    await 회원가입.아이디.press('x');
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });
});
