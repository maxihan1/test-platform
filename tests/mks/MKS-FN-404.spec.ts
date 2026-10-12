import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로, 보이는글 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-404',
  name: '대문자가 섞인 아이디를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('회원가입 아이디 칸에 대문자가 섞인 「Abcd1234」를 적고 칸을 벗어난다', async () => {
    await 회원가입.적고벗어나기(회원가입.아이디, 'Abcd1234');
    await verify('대문자가 섞인 아이디를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 보이는글(회원가입.안내('loginId')), '아이디는 영문 소문자·숫자 4~12자입니다');
  });
});
