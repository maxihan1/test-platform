import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-333',
  name: '「비밀번호 보기」를 누르면 비밀번호 칸의 글자가 그대로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
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

  await test.step('회원가입 비밀번호 칸에 글을 적고 「비밀번호 보기」를 누른다', async () => {
    await 회원가입.적기(회원가입.비밀번호, 'abcd1234!');
    await 회원가입.비밀번호보기.click();
    await verify(
      '「비밀번호 보기」를 누르면 비밀번호 칸의 글자가 그대로 보인다',
      { 종류: await 회원가입.비밀번호.getAttribute('type'), 글: await 회원가입.비밀번호.inputValue() },
      { 종류: 'text', 글: 'abcd1234!' },
    );
  });
});
