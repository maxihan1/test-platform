import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-021',
  name: '관리자 화면 주소를 열면 일반 회원은 권한 없음 화면을 보고 비회원은 로그인 화면으로 간다',
  platforms: ['desktop'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);

  await test.step('로그인 화면에서 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('관리자 화면 주소를 연다', async () => {
    await page.goto('/admin');
    await 관리자.권한없음제목.waitFor();
    await verify('일반 회원이 관리자 화면 주소를 열면 「권한이 없습니다」 화면이 보인다', await 관리자.권한없음제목.isVisible(), true);
    await page.context().clearCookies();
    await page.goto('/admin');
    await 로그인.로그인버튼.waitFor();
    await verify('비회원이 관리자 화면 주소를 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
  });
});
