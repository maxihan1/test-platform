import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-087',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  smoke: true,
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호로 로그인한다', async () => {
    const 계정 = 계정값(params.loginId, params.loginPassword);
    await 로그인.적기(계정.아이디, 계정.비밀번호);
    await 로그인.로그인누르기();
    await 홈.그려질때까지();
    await verify('맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다', await 홈.추천제목.isVisible(), true);
  });

  await test.step('로그인한 뒤 머리글을 확인한다', async () => {
    await verify('맞는 아이디와 비밀번호로 로그인하면 머리글에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true);
  });
});
