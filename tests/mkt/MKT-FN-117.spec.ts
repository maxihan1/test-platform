import { defineCase, test, verify } from '@platform/kit';
import { 새회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-117',
  name: '아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비밀번호 찾기 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 방해창막기(page);
    await 찾기.열기();
    await verify('비밀번호 찾기 화면 제목 「비밀번호 찾기」가 보인다', await 찾기.제목.isVisible(), true, { blocker: true });
  });

  await test.step('맞지 않는 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
    const 없는회원 = 새회원정보();
    await 찾기.채우기(없는회원.loginId, 없는회원.email);
    await 찾기.받기누르기();
    await verify('아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다', await 찾기.결과.innerText(), '일치하는 회원 정보가 없습니다');
  });
});
