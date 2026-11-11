import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-495',
  name: '「누구나 가입 할 수 있음」이면 「가입 하는 이유를 필수로 입력하게 하기」가 눌리지 않는다',
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

  await test.step('「누가 가입할 수 있는지」를 「누구나 가입 할 수 있음」으로 둔다', async () => {
    await 설정.열기('registrations');
    await 설정.가입방식.selectOption({ label: '누구나 가입 할 수 있음' });
    const 잠겼다 = await 설정.가입이유필수잠김.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「누구나 가입 할 수 있음」이면 「가입 하는 이유를 필수로 입력하게 하기」가 눌리지 않는다', 잠겼다, true);
  });
});
