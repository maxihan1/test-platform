import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-129',
  name: '일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
    '비회원이다',
  ],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = new 관리자화면(page);
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('일반 회원으로 /admin 을 연다', async () => {
    await 관리자.열기();
    await 관리자.권한없음문구.waitFor();
    await verify('일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다', await 관리자.권한없음제목.isVisible(), true);
  });

  await test.step('비회원으로 /admin 을 연다', async () => {
    await page.context().clearCookies();
    await 관리자.열기();
    await 로그인.제목.waitFor();
    await verify('비회원이 /admin 을 열면 로그인 화면으로 간다', new URL(page.url()).pathname, '/login');
  });
});
