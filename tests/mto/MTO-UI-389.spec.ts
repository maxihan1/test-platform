import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-389',
  name: '서버 설정에서 「가입」 탭을 누르면 「누가 가입할 수 있는지」 칸이 있는 가입 탭이 열린다',
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

  await test.step('「서버 설정」 화면에서 「가입」 탭을 누른다', async () => {
    await 설정.열기();
    await 설정.탭('가입').click();
    const 열렸다 = await 설정.가입방식.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('서버 설정에서 「가입」 탭을 누르면 「누가 가입할 수 있는지」 칸이 있는 가입 탭이 열린다', 열렸다, true);
  });

  await test.step('「서버 설정」 화면에서 「발견하기」 탭을 누른다', async () => {
    await 설정.열기();
    await 설정.탭('발견하기').click();
    const 열렸다 = await 설정.유행활성화.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('서버 설정에서 「발견하기」 탭을 누르면 「유행 활성화」 칸이 있는 발견하기 탭이 열린다', 열렸다, true);
  });
});
