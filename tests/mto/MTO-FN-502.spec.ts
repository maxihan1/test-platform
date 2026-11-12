import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 경고프리셋정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-502',
  name: '「프리셋 텍스트」를 비우고 「새로 추가」를 누르면 프리셋이 만들어지지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프리셋 = new 경고프리셋화면(page);
  const 제목 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「프리셋 텍스트」를 비우고 「새로 추가」를 누른다', async () => {
      await 프리셋.열기();
      await 프리셋.제목칸.fill(제목);
      await 프리셋.새로추가하고기다리기();
      await 프리셋.오류안내.first().waitFor({ timeout: 10_000 });
      await 프리셋.열기();
      await verify('「프리셋 텍스트」를 비우고 「새로 추가」를 누르면 프리셋이 만들어지지 않는다', await 프리셋.프리셋줄(제목).count(), 0);
    });
  } finally {
    await 경고프리셋정리(page, 제목);
  }
});
