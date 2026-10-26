import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-007',
  name: '관리자 머리글에 「관리자」 링크가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 계정으로로그인(page, params.adminId, params.adminPassword);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('관리자 계정으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('관리자 머리글에 「관리자」 링크가 보인다', await 홈.머리.관리자.isVisible(), true);
  });
});
