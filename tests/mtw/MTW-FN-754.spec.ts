import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 앱승인화면 } from './pages/oauth-authorize.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-754',
  name: '비회원이 앱 승인 주소를 열면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 승인 = new 앱승인화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비회원으로 앱 승인 주소를 연다', async () => {
    await 한국어로(page);
    await 승인.열기();
    await 로그인.그려질때까지();
    await verify('비회원이 앱 승인 주소를 열면 로그인 화면으로 간다', new URL(page.url()).pathname, 로그인화면.주소);
  });
});
