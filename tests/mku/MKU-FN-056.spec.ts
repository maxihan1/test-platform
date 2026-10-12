import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-056',
  name: '비밀번호 확인을 비밀번호와 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다',
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

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('비밀번호 칸에 「Abc1234!」를 적는다', async () => {
    await 회원가입.비밀번호.fill('Abc1234!');
  });

  await test.step('비밀번호 칸이 맞게 채워졌는지 확인한다', async () => {
    await verify('비밀번호 칸 아래 오류 글자가 보이지 않는다', await 보이는글(회원가입.안내('password')), '', { blocker: true });
  });

  await test.step('비밀번호 확인 칸을 비밀번호와 다르게 적고 다른 칸으로 옮긴다', async () => {
    await 회원가입.비밀번호확인.fill('Abc1234?');
    await verify('비밀번호 확인을 비밀번호와 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다', await 보이는글(회원가입.안내('passwordConfirm')), '비밀번호가 일치하지 않습니다');
  });
});
