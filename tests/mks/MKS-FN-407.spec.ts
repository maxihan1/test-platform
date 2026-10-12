import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로, 보이는글 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-407',
  name: '비밀번호 확인을 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다',
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

  await test.step('회원가입 비밀번호 확인 칸에 비밀번호와 다른 글을 적고 칸을 벗어난다', async () => {
    await 회원가입.적기(회원가입.비밀번호, 'abcd1234!');
    await 회원가입.적고벗어나기(회원가입.비밀번호확인, 'abcd1234?');
    await verify('비밀번호 확인을 다르게 적으면 「비밀번호가 일치하지 않습니다」가 보인다', await 보이는글(회원가입.안내('passwordConfirm')), '비밀번호가 일치하지 않습니다');
  });
});
