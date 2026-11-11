import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-534',
  name: '서버 규칙 「규칙 추가」를 빠르게 두 번 누르면 규칙이 하나만 생긴다',
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
  const 규칙 = new 서버규칙화면(page);
  const 글 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await 관리.사이드바.그려질때까지();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
    });

    await test.step('「규칙」을 적고 「규칙 추가」를 빠르게 두 번 누른다', async () => {
      await 규칙.추가폼열기();
      await 규칙.규칙칸.fill(글);
      await 규칙.추가제출.dblclick();
      await 규칙.규칙줄(글).first().waitFor();
      await 규칙.열기();
      await verify('서버 규칙 「규칙 추가」를 빠르게 두 번 누르면 규칙이 하나만 생긴다', await 규칙.규칙줄(글).count(), 1);
    });
  } finally {
    await 서버규칙정리(page, 글);
  }
});
