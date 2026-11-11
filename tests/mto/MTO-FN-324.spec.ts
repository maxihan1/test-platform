import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 경고프리셋정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-324',
  name: '제목과 프리셋 텍스트를 적고 「새로 추가」를 누르면 목록에 그 제목과 본문 요약이 보인다',
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
  const 본문 = `MTO 시험 경고 ${제목}`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「제목」과 「프리셋 텍스트」를 적고 「새로 추가」를 누른다', async () => {
      await 프리셋.열기();
      await 프리셋.적기(제목, 본문);
      await 프리셋.새로추가하고기다리기();
      const 제목보임 = await 프리셋.프리셋줄(제목).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 제목줄 = await verify('목록에 그 제목이 보인다', 제목보임, true);
      const 본문줄 = await verify('목록에 그 본문 요약이 보인다', (await 프리셋.프리셋줄(제목).first().innerText()).includes(본문), true);
      await verify('제목과 프리셋 텍스트를 적고 「새로 추가」를 누르면 목록에 그 제목과 본문 요약이 보인다', 제목줄 && 본문줄, true);
    });
  } finally {
    await 경고프리셋정리(page, 제목);
  }
});
