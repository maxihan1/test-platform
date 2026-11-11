import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-504',
  name: '기본 권한에 안전하지 않은 권한을 넣어 저장하면 「기본 역할로 사용하기에 안전하지 않은 권한을 포함하고 있습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 기본 권한 수정 화면에 「초대」 밖 권한 칸이 없다',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 역할화면(page);
  const 폼 = new 역할폼화면(page);

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「기본 권한」 수정 화면에서 「초대」 묶음 밖 권한을 켜고 저장한다', async () => {
      await 목록.열기();
      await 목록.기본권한수정.click();
      await 폼.저장.waitFor();
      await 폼.권한전체('대시보드 보기').check();
      await 폼.저장.click();
      const 보인다 = await 폼.안전하지않음오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('기본 권한에 안전하지 않은 권한을 넣어 저장하면 「기본 역할로 사용하기에 안전하지 않은 권한을 포함하고 있습니다」가 보인다', 보인다, true);
    });
  } finally {
    await 목록.열기();
    await 목록.기본권한수정.click();
    await 폼.저장.waitFor();
    if (await 폼.권한전체('대시보드 보기').isChecked()) {
      await 폼.권한전체('대시보드 보기').uncheck();
      await 폼.저장.click();
      await 목록.알림.모두.first().waitFor();
    }
  }
});
