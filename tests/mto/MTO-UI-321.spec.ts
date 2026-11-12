import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-321',
  name: 'Moderator 역할 수정 화면에 우선순위 「10」과 켜진 권한 「대시보드 보기」 · 「감사 기록 보기」 · 「실시간 및 화제 피드 보기」 · 「사용자 관리」 · 「신고 관리」 · 「분류 관리」가 보인다',
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

  await test.step('「역할」 화면에서 Moderator 카드의 「수정」을 누른다', async () => {
    await 목록.열기();
    await 목록.수정('Moderator').click();
    await 폼.저장.waitFor();
    const 순위 = await verify('우선순위가 「10」이다', await 폼.우선순위.inputValue(), '10');
    const 권한1 = await verify('「대시보드 보기」이 켜져 있다', await 폼.권한전체('대시보드 보기').isChecked(), true);
    const 권한2 = await verify('「감사 기록 보기」이 켜져 있다', await 폼.권한전체('감사 기록 보기').isChecked(), true);
    const 권한3 = await verify('「실시간 및 화제 피드 보기」이 켜져 있다', await 폼.권한전체('실시간 및 화제 피드 보기').isChecked(), true);
    const 권한4 = await verify('「사용자 관리」이 켜져 있다', await 폼.권한전체('사용자 관리').isChecked(), true);
    const 권한5 = await verify('「신고 관리」이 켜져 있다', await 폼.권한전체('신고 관리').isChecked(), true);
    const 권한6 = await verify('「분류 관리」이 켜져 있다', await 폼.권한전체('분류 관리').isChecked(), true);
    await verify('Moderator 역할 수정 화면에 우선순위 「10」과 켜진 권한 「대시보드 보기」 · 「감사 기록 보기」 · 「실시간 및 화제 피드 보기」 · 「사용자 관리」 · 「신고 관리」 · 「분류 관리」가 보인다', 순위 && 권한1 && 권한2 && 권한3 && 권한4 && 권한5 && 권한6, true);
  });
});
