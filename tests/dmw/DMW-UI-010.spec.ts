import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-010',
  name: '회원 머리글에 알림 종 아이콘이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 계정으로로그인(page, params.loginId, params.loginPassword);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('회원 머리글에 알림 종 아이콘이 보인다', await 홈.머리.알림종.isVisible(), true);
  });
});
