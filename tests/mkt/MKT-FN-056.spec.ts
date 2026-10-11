import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-056',
  name: '눈 모양 버튼을 다시 누르면 비밀번호가 가려진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
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

  await test.step('비밀번호를 적고 눈 모양 버튼을 눌러 비밀번호를 보이게 한다', async () => {
    await 회원가입.비밀번호.fill('Abc1234!');
    await 회원가입.비밀번호보기.click();
  });

  await test.step('비밀번호가 글자로 보이는지 확인한다', async () => {
    await verify('비밀번호가 글자로 보인다', await 회원가입.비밀번호.getAttribute('type'), 'text', { blocker: true });
  });

  await test.step('눈 모양 버튼을 한 번 더 누른다', async () => {
    await 회원가입.비밀번호보기.click();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 가려진다', await 회원가입.비밀번호.getAttribute('type'), 'password');
  });
});
