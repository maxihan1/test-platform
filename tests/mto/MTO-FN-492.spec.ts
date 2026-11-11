import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-492',
  name: '없는 사용자명을 적고 저장하면 「해당 사용자명에 대한 로컬 유저를 찾을 수 없습니다」가 보인다',
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

  await test.step('「연락 받을 관리자 사용자명」에 없는 이름을, 「연락처 이메일」에 주소를 적고 저장한다', async () => {
    await 설정.열기('branding');
    await 설정.연락관리자.fill('mto_nobody');
    await 설정.연락이메일.fill('mto-contact@maxihan.com');
    await 설정.저장하기();
    const 보인다 = await 설정.사용자명없음오류.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('없는 사용자명을 적고 저장하면 「해당 사용자명에 대한 로컬 유저를 찾을 수 없습니다」가 보인다', 보인다, true);
  });
});
