import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-349',
  name: '「발행 일정」을 내일로 적어 공지를 만들면 목록 줄에 「에 예약됨」이 보인다',
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
  const 폼 = new 공지사항폼화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「발행 일정」을 내일로 적어 공지를 만든다', async () => {
      await 폼.예약하기(글, new Date(Date.now() + 24 * 60 * 60 * 1000));
      await 폼.알림.글('공지의 발행이 예약되었습니다!').waitFor();
      await verify('「발행 일정」을 내일로 적어 공지를 만들면 목록 줄에 「에 예약됨」이 보인다', await 공지.예약표시(글).isVisible(), true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
