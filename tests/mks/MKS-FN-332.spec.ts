import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-332',
  name: '약관 하나를 끄면 「전체 동의」가 꺼진다',
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

  await test.step('「전체 동의」를 켠다', async () => {
    await 회원가입.전체동의.check();
    await verify('「전체 동의」가 켜져 있다', await 회원가입.전체동의.isChecked(), true, { blocker: true });
  });

  await test.step('「전체 동의」를 켠 뒤 「(필수) 이용약관 동의」를 끈다', async () => {
    await 회원가입.이용약관동의.uncheck();
    await verify('약관 하나를 끄면 「전체 동의」가 꺼진다', await 회원가입.전체동의.isChecked(), false);
  });
});
