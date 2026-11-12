import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-247',
  name: '이용 약관 화면에 탭 「현재」 · 「초안」 · 「역사」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 약관 = new 이용약관화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「이용 약관」 화면을 연다', async () => {
    await 약관.열기();
    const 현재 = await verify('「현재」 탭이 보인다', await 약관.현재탭.isVisible(), true);
    const 초안 = await verify('「초안」 탭이 보인다', await 약관.초안탭.isVisible(), true);
    const 역사 = await verify('「역사」 탭이 보인다', await 약관.역사탭.isVisible(), true);
    await verify('이용 약관 화면에 탭 「현재」 · 「초안」 · 「역사」가 보인다', 현재 && 초안 && 역사, true);
  });
});
