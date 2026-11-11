import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-317',
  name: '역할 추가 폼 「관리」 묶음에 「설정 관리」 · 「규칙 관리」 · 「공지 관리」 · 「커스텀 에모지 관리」 · 「웹훅 관리」 · 「역할 관리」가 보인다',
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

  await test.step('「역할」 화면에서 「역할 추가」를 누른다', async () => {
    await 목록.열기();
    await 목록.역할추가.click();
    await 폼.이름.waitFor();
    const 권한1 = await verify('「관리」 묶음에 「설정 관리」이 보인다', await 폼.권한('관리', '설정 관리').isVisible(), true);
    const 권한2 = await verify('「관리」 묶음에 「규칙 관리」이 보인다', await 폼.권한('관리', '규칙 관리').isVisible(), true);
    const 권한3 = await verify('「관리」 묶음에 「공지 관리」이 보인다', await 폼.권한('관리', '공지 관리').isVisible(), true);
    const 권한4 = await verify('「관리」 묶음에 「커스텀 에모지 관리」이 보인다', await 폼.권한('관리', '커스텀 에모지 관리').isVisible(), true);
    const 권한5 = await verify('「관리」 묶음에 「웹훅 관리」이 보인다', await 폼.권한('관리', '웹훅 관리').isVisible(), true);
    const 권한6 = await verify('「관리」 묶음에 「역할 관리」이 보인다', await 폼.권한('관리', '역할 관리').isVisible(), true);
    await verify('역할 추가 폼 「관리」 묶음에 「설정 관리」 · 「규칙 관리」 · 「공지 관리」 · 「커스텀 에모지 관리」 · 「웹훅 관리」 · 「역할 관리」가 보인다', 권한1 && 권한2 && 권한3 && 권한4 && 권한5 && 권한6, true);
  });
});
