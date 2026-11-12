import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 폼오류 } from './components/form-error.component.js';

export const spec = defineCase({
  tcId: 'MTO-FN-536',
  name: '새 공지사항 폼 「공지사항」에 공백만 넣고 「공지사항 생성」을 누르면 비웠을 때처럼 공지가 만들어지지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 공지사항화면(page);
  const 폼 = new 공지사항폼화면(page);
  const 오류 = new 폼오류(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await 관리.사이드바.그려질때까지();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
  });

  await test.step('새 공지사항 폼 「공지사항」에 공백만 넣고 「공지사항 생성」을 누른다', async () => {
    await 목록.열기();
    const 전 = await 목록.공지줄들.count();
    await 폼.즉시발행하기('   ');
    await 오류.요약.or(폼.알림.모두).first().waitFor();
    await 목록.열기();
    await verify('새 공지사항 폼 「공지사항」에 공백만 넣고 「공지사항 생성」을 누르면 비웠을 때처럼 공지가 만들어지지 않는다', await 목록.공지줄들.count(), 전);
  });
});
