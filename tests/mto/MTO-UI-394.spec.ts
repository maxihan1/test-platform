import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이메일뉴스레터화면 } from './pages/email-subscriptions.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-394',
  name: '기능이 켜진 서버의 이메일 뉴스레터 화면에 「시작하기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 화면 = new 이메일뉴스레터화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「이메일 뉴스레터」 화면을 연다', async () => {
    await 화면.열기();
    await verify('기능이 켜진 서버의 이메일 뉴스레터 화면에 「시작하기」가 보인다', await 화면.시작하기.isVisible(), true);
  });
});
