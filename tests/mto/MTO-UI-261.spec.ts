import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-261',
  name: '경고 프리셋 화면에 「제목」 · 「프리셋 텍스트」 칸과 「새로 추가」, 프리셋 목록이 함께 보인다',
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

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「경고 프리셋」 화면을 연다', async () => {
    await 프리셋.열기();
    const 제목 = await verify('「제목」 칸이 보인다', await 프리셋.제목칸.isVisible(), true);
    const 본문 = await verify('「프리셋 텍스트」 칸이 보인다', await 프리셋.본문칸.isVisible(), true);
    const 추가 = await verify('「새로 추가」가 보인다', await 프리셋.새로추가.isVisible(), true);
    const 목록 = await verify('프리셋 목록이 보인다', await 프리셋.프리셋줄들.first().isVisible(), true);
    await verify('경고 프리셋 화면에 「제목」 · 「프리셋 텍스트」 칸과 「새로 추가」, 프리셋 목록이 함께 보인다', 제목 && 본문 && 추가 && 목록, true);
  });
});
