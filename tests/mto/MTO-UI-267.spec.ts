import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 역할폼화면 } from './pages/role-form.page.js';
import { 역할화면 } from './pages/roles.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-267',
  name: '역할 추가 폼에 「이름」 · 「우선순위」 · 「배지 색상」 · 「2단계 인증 필요」 · 「사용자당 최대 컬렉션 개수」 값 「10」과 권한 묶음 「초대」 · 「이메일」 · 「중재」 · 「관리」 · 「데브옵스」 · 「특수」가 보인다',
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
    await 폼.추가제출.waitFor();
    const 이름 = await verify('「이름」 칸이 보인다', await 폼.이름.isVisible(), true);
    const 순위 = await verify('「우선순위」 칸이 보인다', await 폼.우선순위.isVisible(), true);
    const 색상 = await verify('「배지 색상」 칸이 보인다', await 폼.배지색상.isVisible(), true);
    const 인증 = await verify('「2단계 인증 필요」가 보인다', await 폼.이단계인증.isVisible(), true);
    const 컬렉션 = await verify('「사용자당 최대 컬렉션 개수」 값이 「10」이다', await 폼.컬렉션한도.inputValue(), '10');
    const 묶음1 = await verify('권한 묶음 「초대」이 보인다', await 폼.묶음제목('초대').isVisible(), true);
    const 묶음2 = await verify('권한 묶음 「이메일」이 보인다', await 폼.묶음제목('이메일').isVisible(), true);
    const 묶음3 = await verify('권한 묶음 「중재」이 보인다', await 폼.묶음제목('중재').isVisible(), true);
    const 묶음4 = await verify('권한 묶음 「관리」이 보인다', await 폼.묶음제목('관리').isVisible(), true);
    const 묶음5 = await verify('권한 묶음 「데브옵스」이 보인다', await 폼.묶음제목('데브옵스').isVisible(), true);
    const 묶음6 = await verify('권한 묶음 「특수」이 보인다', await 폼.묶음제목('특수').isVisible(), true);
    await verify('역할 추가 폼에 「이름」 · 「우선순위」 · 「배지 색상」 · 「2단계 인증 필요」 · 「사용자당 최대 컬렉션 개수」 값 「10」과 권한 묶음 「초대」 · 「이메일」 · 「중재」 · 「관리」 · 「데브옵스」 · 「특수」가 보인다', 이름 && 순위 && 색상 && 인증 && 컬렉션 && 묶음1 && 묶음2 && 묶음3 && 묶음4 && 묶음5 && 묶음6, true);
  });
});
