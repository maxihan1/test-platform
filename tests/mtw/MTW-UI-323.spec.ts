import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 확인링크재전송화면 } from './pages/confirmation.page.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-323',
  name: '암호 재설정 버튼 반응',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 재설정 = new 암호재설정화면(page);
  const 로그인 = new 로그인화면(page);
  const 가입 = new 가입화면(page);
  const 확인링크 = new 확인링크재전송화면(page);

  await test.step('암호 재설정 화면에서 「로그인」을 누른다', async () => {
    await 한국어로(page);
    await 재설정.열기();
    await 재설정.로그인.click();
    await 로그인.그려질때까지();
    await verify('암호 재설정 화면에서 「로그인」을 누르면 /auth/sign_in 으로 간다', new URL(page.url()).pathname, 로그인화면.주소);
  });

  await test.step('암호 재설정 화면에서 「등록하기」를 누른다', async () => {
    await 재설정.열기();
    await 재설정.등록하기.click();
    await 가입.등록하기.waitFor();
    await verify('암호 재설정 화면에서 「등록하기」를 누르면 /auth/sign_up 으로 간다', new URL(page.url()).pathname, 가입화면.주소);
  });

  await test.step('암호 재설정 화면에서 「확인 링크를 못 받았나요?」를 누른다', async () => {
    await 재설정.열기();
    await 재설정.확인링크못받음.click();
    await 확인링크.보내기.waitFor();
    await verify('암호 재설정 화면에서 「확인 링크를 못 받았나요?」를 누르면 /auth/confirmation/new 로 간다', new URL(page.url()).pathname, 확인링크재전송화면.주소);
  });
});
