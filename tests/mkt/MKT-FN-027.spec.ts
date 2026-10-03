import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '버튼과 링크는 키보드 Tab 으로 이동하고 Enter 로 누를 수 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    path: z.string().describe('Enter 를 친 뒤 화면 경로').default('/signup'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 로그인화면(page);
  const 가입 = new 회원가입화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('로그인 화면에서 Tab 으로 「회원가입」 링크까지 옮기고 Enter 를 친다', async () => {
    await 화면.탭으로옮긴다(화면.회원가입링크);
    await page.keyboard.press('Enter');
    await 가입.가입버튼.waitFor();
    await verify('버튼과 링크는 키보드 Tab 으로 이동하고 Enter 로 누를 수 있다', new URL(page.url()).pathname, expected.path);
  });
});
