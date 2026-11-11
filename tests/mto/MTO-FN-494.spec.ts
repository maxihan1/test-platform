import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-494',
  name: '연락처 이메일만 적고 저장하면 저장되지 않고 오류가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「연락처 이메일」만 적고 「연락 받을 관리자 사용자명」은 비워 저장한다', async () => {
    await 설정.열기('branding');
    const 원래메일 = await 설정.연락이메일.inputValue();
    await 설정.연락관리자.fill('');
    await 설정.연락이메일.fill('mto-contact-only@maxihan.com');
    await 설정.저장하기();
    const 오류떴다 = await 설정.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await 설정.열기('branding');
    const 안저장 = await verify('저장되지 않는다', await 설정.연락이메일.inputValue(), 원래메일);
    const 안내 = await verify('오류가 보인다', 오류떴다, true);
    await verify('연락처 이메일만 적고 저장하면 저장되지 않고 오류가 보인다', 안저장 && 안내, true);
  });
});
