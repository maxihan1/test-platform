import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 서버규칙만들기, 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙수정화면 } from './pages/rule-edit.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-257',
  name: '서버 규칙 수정 화면에 「번역 추가」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 서버 규칙이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 규칙 = new 서버규칙화면(page);
  const 수정 = new 서버규칙수정화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 서버 규칙을 만든다', async () => {
      await 서버규칙만들기(page, 글);
    });

    await test.step('케이스가 만든 서버 규칙이 있는지 확인한다', async () => {
      await 규칙.열기();
      await verify('케이스가 만든 서버 규칙이 있다', await 규칙.규칙줄(글).count(), 1, { blocker: true });
    });

    await test.step('그 규칙을 눌러 수정 화면을 연다', async () => {
      await 규칙.수정열기(글);
      const 열렸다 = await 수정.번역추가.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('서버 규칙 수정 화면에 「번역 추가」가 보인다', 열렸다, true);
    });
  } finally {
    await 서버규칙정리(page, 글);
  }
});
