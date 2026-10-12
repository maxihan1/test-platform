import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-055',
  name: '휴대폰 칸에 숫자 아닌 글자를 섞어 적으면 숫자만 남는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('회원가입 휴대폰 칸에 「010abc12345」를 적는다', async () => {
    await 회원가입.적기(회원가입.휴대폰, '010abc12345');
    await verify('휴대폰 칸에 숫자 아닌 글자를 섞어 적으면 숫자만 남는다', await 회원가입.휴대폰.inputValue(), '01012345');
  });
});
