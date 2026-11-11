import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-040',
  name: 'Owner 가 대시보드에서 「신고 열림」 타일을 누르면 「신고」 화면으로 간다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('대시보드에서 「신고 열림」 타일을 누른다', async () => {
    await 대시보드.열기();
    await 관리.누르기(대시보드.신고열림타일);
    await verify('Owner 가 대시보드에서 「신고 열림」 타일을 누르면 「신고」 화면으로 간다', await 관리.제목이('신고').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
