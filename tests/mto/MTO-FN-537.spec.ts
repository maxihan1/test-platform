import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';
import { 공지정리 } from './helpers/settings-data.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인하기 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'MTO-FN-537',
  name: '새 공지사항 폼 「공지사항 생성」을 빠르게 두 번 누르면 공지가 하나만 생긴다',
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
  const 글 = 고유이름('MTO 시험 공지 ');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await 관리.사이드바.그려질때까지();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
    });

    await test.step('새 공지사항 폼에 글을 적고 「공지사항 생성」을 빠르게 두 번 누른다', async () => {
      await 폼.새폼열기();
      await 폼.본문칸.fill(글);
      await 폼.생성.dblclick();
      await 폼.알림.글('공지사항이 성공적으로 발행되었습니다!').first().waitFor();
      await 목록.열기();
      await verify('새 공지사항 폼 「공지사항 생성」을 빠르게 두 번 누르면 공지가 하나만 생긴다', await 목록.공지줄(글).count(), 1);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
