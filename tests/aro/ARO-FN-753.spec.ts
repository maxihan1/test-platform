import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-753',
  name: '아이디에 공백만 적고 로그인하면 「아이디와 비밀번호를 입력하세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
  });

  await test.step('아이디 칸에 공백만 적고 비밀번호를 적어 「로그인」을 누른다', async () => {
    await 로그인.로그인('   ', '시험용 비밀번호');
    await verify('아이디에 공백만 적고 로그인하면 「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류뜰때까지(), '아이디와 비밀번호를 입력하세요');
  });
});
