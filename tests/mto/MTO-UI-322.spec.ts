import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-322',
  name: 'Admin 역할 수정 화면에 우선순위 「100」이 보이고 「데브옵스」 · 「이메일 구독 관리」 · 「심사 없이 사용자 초대」는 꺼져 있다',
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

  await test.step('「역할」 화면에서 Admin 카드의 「수정」을 누른다', async () => {
    await 목록.열기();
    await 목록.수정('Admin').click();
    await 폼.저장.waitFor();
    const 순위 = await verify('우선순위가 「100」이다', await 폼.우선순위.inputValue(), '100');
    const 권한1 = await verify('「데브옵스」이 꺼져 있다', await 폼.권한전체('데브옵스').isChecked(), false);
    const 권한2 = await verify('「이메일 구독 관리」이 꺼져 있다', await 폼.권한전체('이메일 구독 관리').isChecked(), false);
    const 권한3 = await verify('「심사 없이 사용자 초대」이 꺼져 있다', await 폼.권한전체('심사 없이 사용자 초대').isChecked(), false);
    await verify('Admin 역할 수정 화면에 우선순위 「100」이 보이고 「데브옵스」 · 「이메일 구독 관리」 · 「심사 없이 사용자 초대」는 꺼져 있다', 순위 && 권한1 && 권한2 && 권한3, true);
  });
});
