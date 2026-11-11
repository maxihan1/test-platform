import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-267',
  name: 'Owner 가 사이드바 「추천과 유행」을 누르면 제목 「유행하는 게시물」 화면이 열린다',
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

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('사이드바 「추천과 유행」을 누른다', async () => {
    await 관리.누르기(관리.사이드바.추천과유행);
    await verify('Owner 가 사이드바 「추천과 유행」을 누르면 제목 「유행하는 게시물」 화면이 열린다', await 관리.제목이('유행하는 게시물').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
