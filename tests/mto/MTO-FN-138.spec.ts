import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-138',
  name: 'Owner 가 사이드바 「중재」 › 「신고」를 누르면 제목 「신고」 화면이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 화면 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인하고 관리 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await 관리.사이드바.그려질때까지();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
  });

  await test.step('사이드바 「중재」 › 「신고」를 누른다', async () => {
    await 관리.사이드바.중재.click();
    await 관리.사이드바.메뉴('신고').click();
    const 열림 = await 화면.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('Owner 가 사이드바 「중재」 › 「신고」를 누르면 제목 「신고」 화면이 열린다', 열림, true);
  });
});
