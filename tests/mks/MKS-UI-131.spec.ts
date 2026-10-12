import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-131',
  name: '회원가입 화면에 「가입하기」 버튼이 비활성으로 보인다',
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
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
    await verify(
      '회원가입 화면에 「가입하기」 버튼이 비활성으로 보인다',
      { 보임: await 회원가입.가입하기.isVisible(), 눌림: await 회원가입.가입하기.isEnabled() },
      { 보임: true, 눌림: false },
    );
  });
});
