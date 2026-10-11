import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-150',
  name: 'Tab 으로 「회원가입」 링크에 가서 Enter 를 치면 회원가입 화면으로 간다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 가입 = new 회원가입화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('로그인 화면에서 Tab 으로 「회원가입」 링크까지 가서 Enter 를 친다', async () => {
    await 로그인.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 로그인.Tab으로회원가입링크까지가기();
    await page.keyboard.press('Enter');
    await 가입.제목.waitFor();
    await verify('Tab 으로 「회원가입」 링크에 가서 Enter 를 치면 회원가입 화면으로 간다', new URL(page.url()).pathname, '/signup');
  });
});
