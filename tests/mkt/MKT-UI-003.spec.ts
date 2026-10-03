import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-003',
  name: '관리자에게는 머리글에 「관리자」 링크가 더 보인다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);

  await test.step('로그인 화면에서 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 머리.로그아웃.waitFor();
    await verify('관리자에게는 머리글에 「관리자」 링크가 더 보인다', await 머리.관리자링크.isVisible(), true);
  });
});
