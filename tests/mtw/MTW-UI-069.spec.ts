import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-069',
  name: '로그인 화면에서 「등록하기」를 누르면 가입 화면으로 간다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 가입 = new 가입화면(page);

  await test.step('로그인 화면에서 「등록하기」를 누른다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await 로그인.등록하기.click();
    await 가입.등록하기.waitFor();
    await verify('로그인 화면에서 「등록하기」를 누르면 가입 화면으로 간다', new URL(page.url()).pathname, 가입화면.주소);
  });
});
