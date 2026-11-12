import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지정리, 공지즉시발행 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-022',
  name: '공지를 하나 만들고 「감사 로그」 화면을 열면 맨 위 줄에 그 공지를 만든 기록이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 감사 = new 감사로그화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('공지를 하나 만들고 「감사 로그」 화면을 연다', async () => {
      await 공지즉시발행(page, 글);
      await 감사.열기();
      const 줄 = (await 감사.맨위줄().innerText()).replace(/\s+/g, ' ');
      await verify('공지를 하나 만들고 「감사 로그」 화면을 열면 맨 위 줄에 그 공지를 만든 기록이 보인다', 줄.includes(`새 공지 ${글}`), true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
