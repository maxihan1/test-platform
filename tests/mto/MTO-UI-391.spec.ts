import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 경고프리셋만들기, 경고프리셋정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 경고프리셋편집화면 } from './pages/warning-preset-edit.page.js';
import { 경고프리셋화면 } from './pages/warning-presets.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-391',
  name: '경고 프리셋 제목을 누르면 「경고 프리셋 편집」 화면이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 경고 프리셋이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프리셋 = new 경고프리셋화면(page);
  const 편집 = new 경고프리셋편집화면(page);
  const 제목 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 경고 프리셋을 만든다', async () => {
      await 경고프리셋만들기(page, 제목, 'MTO 시험 경고 본문');
    });

    await test.step('케이스가 만든 경고 프리셋이 있는지 확인한다', async () => {
      await 프리셋.열기();
      await verify('케이스가 만든 경고 프리셋이 있다', await 프리셋.프리셋줄(제목).count(), 1, { blocker: true });
    });

    await test.step('목록에서 그 프리셋 제목을 누른다', async () => {
      await 프리셋.프리셋링크(제목).click();
      const 열렸다 = await 편집.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('경고 프리셋 제목을 누르면 「경고 프리셋 편집」 화면이 열린다', 열렸다, true);
    });
  } finally {
    await 경고프리셋정리(page, 제목);
  }
});
