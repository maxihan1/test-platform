import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-021',
  name: '로그인하면 홈 화면으로 가고 비밀번호 칸에서 Enter 를 쳐도 로그인된다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 비밀번호 = params.password ?? '';

  await test.step('맞는 아이디와 비밀번호로 로그인한다', async () => {
    await 화면.열기();
    await 화면.로그인하기(params.loginId, 비밀번호);
    await 머리.로그아웃버튼().waitFor();
    await verify('맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다', new URL(page.url()).pathname, '/');
  });

  await test.step('비밀번호 칸에서 Enter 를 친다', async () => {
    await page.context().clearCookies();
    await 화면.열기();
    await 화면.엔터로로그인하기(params.loginId, 비밀번호);
    await 머리.마이페이지링크().waitFor();
    await verify('비밀번호 칸에서 Enter 를 치면 로그인 버튼을 누른 것처럼 로그인된다', await 머리.로그아웃버튼().isVisible(), true);
  });
});
