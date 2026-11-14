import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/guest-landing.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-321',
  name: '로그인 화면에서 머리 로고를 누르면 /explore 로 간다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 전화면 = new 로그인전화면(page);

  await test.step('로그인 화면에서 머리 로고를 누른다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await 로그인.머리로고.click();
    await 전화면.계정생성.waitFor();
    await verify('로그인 화면에서 머리 로고를 누르면 /explore 로 간다', new URL(page.url()).pathname, 로그인전화면.주소);
  });
});
