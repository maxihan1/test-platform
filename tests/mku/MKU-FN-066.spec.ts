import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-066',
  name: '관심 분야를 3개 고른 채 하나를 더 켜도 켜진 체크박스는 3개다',
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

  await test.step('관심 분야 셋을 켠 뒤 「식품」을 켠다', async () => {
    await 회원가입.관심패션.check();
    await 회원가입.관심전자기기.check();
    await 회원가입.관심도서.check();
    await 회원가입.관심식품.click();
    await verify('관심 분야를 3개 고른 채 하나를 더 켜도 켜진 체크박스는 3개다', await 회원가입.켜진관심분야수(), 3);
  });
});
