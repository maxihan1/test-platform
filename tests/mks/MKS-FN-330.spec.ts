import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로, 켜진이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-330',
  name: '관심 분야를 3개 켜면 3개가 모두 켜진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
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

  await test.step('회원가입 관심 분야 「패션」 · 「전자기기」 · 「도서」를 켠다', async () => {
    await 회원가입.관심패션.check();
    await 회원가입.관심전자기기.check();
    await 회원가입.관심도서.check();
    await verify(
      '관심 분야를 3개 켜면 3개가 모두 켜진다',
      await 켜진이름들({ 패션: 회원가입.관심패션, 전자기기: 회원가입.관심전자기기, 도서: 회원가입.관심도서, 식품: 회원가입.관심식품 }),
      '패션, 전자기기, 도서',
    );
  });

  await test.step('관심 분야 3개를 켠 채 「식품」을 누른다', async () => {
    await 회원가입.관심식품.click();
    await verify('관심 분야 4번째 「식품」을 누르면 켜지지 않는다', await 회원가입.관심식품.isChecked(), false);
  });
});
