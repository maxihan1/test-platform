import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 확인링크재전송화면 } from './pages/confirmation.page.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-324',
  name: '확인 링크 다시 보내기 버튼 반응',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 확인링크 = new 확인링크재전송화면(page);
  const 로그인 = new 로그인화면(page);
  const 가입 = new 가입화면(page);
  const 재설정 = new 암호재설정화면(page);

  await test.step('확인 링크 다시 보내기 화면에서 「로그인」을 누른다', async () => {
    await 한국어로(page);
    await 확인링크.열기();
    await 확인링크.로그인.click();
    await 로그인.그려질때까지();
    await verify('확인 링크 다시 보내기 화면에서 「로그인」을 누르면 /auth/sign_in 으로 간다', new URL(page.url()).pathname, 로그인화면.주소);
  });

  await test.step('확인 링크 다시 보내기 화면에서 「등록하기」를 누른다', async () => {
    await 확인링크.열기();
    await 확인링크.등록하기.click();
    await 가입.등록하기.waitFor();
    await verify('확인 링크 다시 보내기 화면에서 「등록하기」를 누르면 /auth/sign_up 으로 간다', new URL(page.url()).pathname, 가입화면.주소);
  });

  await test.step('확인 링크 다시 보내기 화면에서 「암호를 잊었나요?」를 누른다', async () => {
    await 확인링크.열기();
    await 확인링크.암호잊음.click();
    await 재설정.보내기.waitFor();
    await verify('확인 링크 다시 보내기 화면에서 「암호를 잊었나요?」를 누르면 /auth/password/new 로 간다', new URL(page.url()).pathname, 암호재설정화면.주소);
  });
});
