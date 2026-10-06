import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';
import { 회원가입화면 } from './pages/common-signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-508',
  name: 'Tab 키를 치면 초점이 아이디 다음 칸인 비밀번호 칸으로 옮겨 간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 가입 = new 회원가입화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 안내창끄기(page);
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면 아이디 칸에서 Tab 키를 친다', async () => {
    await 로그인.아이디칸.focus();
    await page.keyboard.press('Tab');
    await verify('Tab 키를 치면 초점이 아이디 다음 칸인 비밀번호 칸으로 옮겨 간다', await 로그인.초점이비밀번호칸에있나(), true);
  });

  await test.step('로그인 화면 「회원가입」 링크에 초점을 두고 Enter 를 친다', async () => {
    await 로그인.회원가입링크.focus();
    await page.keyboard.press('Enter');
    await 가입.제목.waitFor();
    await verify('링크에서 Enter 를 치면 회원가입 화면으로 간다', new URL(page.url()).pathname, '/signup');
  });
});
