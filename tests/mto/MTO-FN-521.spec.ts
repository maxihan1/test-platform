import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 경고프리셋만들기, 경고프리셋정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-521',
  name: '경고 프리셋을 만들고 지운 뒤 「감사 로그」를 열면 맨 위 줄이 경고 프리셋 기록이 아니다',
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
  const 제목 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「경고 프리셋」을 하나 만들고 지운 뒤 「감사 로그」를 연다', async () => {
      await 경고프리셋만들기(page, 제목, 'MTO 시험 경고 본문');
      await 경고프리셋정리(page, 제목);
      await 감사.열기();
      const 줄 = (await 감사.맨위줄().innerText()).replace(/\s+/g, ' ');
      await verify('경고 프리셋을 만들고 지운 뒤 「감사 로그」를 열면 맨 위 줄이 경고 프리셋 기록이 아니다', 줄.includes('프리셋'), false);
    });
  } finally {
    await 경고프리셋정리(page, 제목);
  }
});
