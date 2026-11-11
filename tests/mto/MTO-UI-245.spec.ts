import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-245',
  name: '외관 탭에 「기본 테마」 · 「사용자 정의 CSS」 · 「사용자 정의 마스코트 (legacy)」가 보인다',
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

  await test.step('「외관」 탭을 연다', async () => {
    await 설정.열기('appearance');
    const 테마 = await verify('「기본 테마」가 보인다', await 설정.기본테마.isVisible(), true);
    const CSS = await verify('「사용자 정의 CSS」가 보인다', await 설정.사용자정의CSS.isVisible(), true);
    const 마스코트 = await verify('「사용자 정의 마스코트 (legacy)」가 보인다', await 설정.사용자정의마스코트.isVisible(), true);
    await verify('외관 탭에 「기본 테마」 · 「사용자 정의 CSS」 · 「사용자 정의 마스코트 (legacy)」가 보인다', 테마 && CSS && 마스코트, true);
  });
});
