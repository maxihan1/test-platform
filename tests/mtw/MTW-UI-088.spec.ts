import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 확인링크재전송화면 } from './pages/confirmation.page.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-088',
  name: '로그인 화면에서 「확인 링크를 못 받았나요?」를 누르면 /auth/confirmation/new 로 간다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 확인링크 = new 확인링크재전송화면(page);
  const 재설정 = new 암호재설정화면(page);

  await test.step('로그인 화면에서 「확인 링크를 못 받았나요?」를 누른다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await 로그인.확인링크못받음.click();
    await 확인링크.보내기.waitFor();
    await verify('로그인 화면에서 「확인 링크를 못 받았나요?」를 누르면 /auth/confirmation/new 로 간다', new URL(page.url()).pathname, 확인링크재전송화면.주소);
  });

  await test.step('로그인 화면에서 「암호를 잊었나요?」를 누른다', async () => {
    await 로그인.열기();
    await 로그인.암호잊음.click();
    await 재설정.보내기.waitFor();
    await verify('「암호를 잊었나요?」 링크는 /auth/password/new 로 이어진다', new URL(page.url()).pathname, 암호재설정화면.주소);
  });
});
