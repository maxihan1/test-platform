import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-277',
  name: '공지사항 화면에 「새 공지사항」과 「모두」 · 「진행 중 (N)」 필터가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「공지사항」 화면을 연다', async () => {
    await 공지.열기();
    const 새 = await verify('「새 공지사항」이 보인다', await 공지.새공지.isVisible(), true);
    const 모두 = await verify('「모두」 필터가 보인다', await 공지.모두필터.isVisible(), true);
    const 진행 = await verify('「진행 중 (N)」 필터가 보인다', await 공지.진행중필터.isVisible(), true);
    await verify('공지사항 화면에 「새 공지사항」과 「모두」 · 「진행 중 (N)」 필터가 보인다', 새 && 모두 && 진행, true);
  });
});
