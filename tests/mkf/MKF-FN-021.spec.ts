import { defineCase, test, verify } from '@platform/kit';

import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-021',
  name: 'Tab 으로 옮겨 간 「회원가입」 링크에서 Enter 를 치면 회원가입 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
  });

  await test.step('로그인 화면에서 Tab 으로 「회원가입」 링크까지 옮긴 뒤 Enter 를 친다', async () => {
    const 링크에닿음 = await 로그인.탭으로회원가입링크까지옮기기();
    await page.keyboard.press('Enter');
    await 회원가입.제목.waitFor();
    await verify(
      'Tab 으로 옮겨 간 「회원가입」 링크에서 Enter 를 치면 회원가입 화면으로 간다',
      { 링크에닿음, 화면: 경로(page) },
      { 링크에닿음: true, 화면: 회원가입화면.주소 },
    );
  });
});
