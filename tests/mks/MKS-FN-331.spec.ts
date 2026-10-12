import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로, 켜진이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-331',
  name: '「전체 동의」를 켜면 약관 동의 체크박스 세 개가 모두 켜진다',
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

  await test.step('회원가입 화면에서 「전체 동의」를 켠다', async () => {
    await 회원가입.전체동의.check();
    await verify(
      '「전체 동의」를 켜면 약관 동의 체크박스 세 개가 모두 켜진다',
      await 켜진이름들({ 이용약관: 회원가입.이용약관동의, 개인정보: 회원가입.개인정보동의, 마케팅: 회원가입.마케팅동의 }),
      '이용약관, 개인정보, 마케팅',
    );
  });
});
