import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-397',
  name: '「기본 권한」 수정 화면에서 「사용자 초대」만 켜져 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
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

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「역할」 화면에서 「기본 권한」의 「수정」을 누른다', async () => {
    await 목록.열기();
    await 목록.기본권한수정.click();
    await 폼.저장.waitFor();
    const 초대 = await verify('「사용자 초대」가 켜져 있다', await 폼.권한전체('사용자 초대').isChecked(), true);
    const 개수 = await verify('켜진 체크박스가 하나뿐이다', await 폼.켜진상자들.count(), 1);
    await verify('「기본 권한」 수정 화면에서 「사용자 초대」만 켜져 있다', 초대 && 개수, true);
  });
});
