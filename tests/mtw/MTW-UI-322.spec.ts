import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면열기 } from './helpers/signup.helper.js';
import { 로그인전화면 } from './pages/guest-landing.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-322',
  name: '가입 버튼 반응',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 가입화면(page);
  const 전화면 = new 로그인전화면(page);

  await test.step('가입 화면에서 동의 체크를 누른다', async () => {
    await 한국어로(page);
    await 가입화면열기(page);
    await 가입.동의하기();
    await verify('가입 화면에서 동의 체크를 누르면 체크된 상태가 된다', await 가입.동의칸.isChecked(), true);
  });

  await test.step('가입 화면에서 머리 로고를 누른다', async () => {
    await 가입화면열기(page);
    await 가입.머리로고.click();
    await 전화면.계정생성.waitFor();
    await verify('가입 화면에서 머리 로고를 누르면 /explore 로 간다', new URL(page.url()).pathname, 로그인전화면.주소);
  });
});
