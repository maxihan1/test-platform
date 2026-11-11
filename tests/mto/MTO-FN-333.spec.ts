import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-333',
  name: 'Owner 가 자기 역할 수정 화면을 열면 「우선순위」 칸과 권한 체크박스가 보이지 않는다',
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

  await test.step('「역할」 화면에서 Owner 카드의 「수정」을 누른다', async () => {
    await 목록.열기();
    await 목록.수정('Owner').click();
    await 폼.저장.waitFor();
    const 순위 = await verify('「우선순위」 칸이 보이지 않는다', await 폼.우선순위.isVisible(), false);
    const 권한 = await verify('권한 체크박스가 보이지 않는다', await 폼.권한묶음제목들.count(), 0);
    await verify('Owner 가 자기 역할 수정 화면을 열면 「우선순위」 칸과 권한 체크박스가 보이지 않는다', 순위 && 권한, true);
  });
});
