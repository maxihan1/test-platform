import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-196',
  name: '로그인한 채 로그인 화면 주소를 열면 홈 화면으로 간다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인한 뒤 로그인 화면이 아니다', new URL(page.url()).pathname.startsWith(로그인화면.주소), false, { blocker: true });
  });

  await test.step('로그인한 채 로그인 화면 주소를 연다', async () => {
    await 로그인.로그인한채열기();
    await 홈.그려질때까지();
    await verify('로그인한 채 로그인 화면 주소를 열면 홈 화면으로 간다', new URL(page.url()).pathname, 홈화면.주소);
  });
});
