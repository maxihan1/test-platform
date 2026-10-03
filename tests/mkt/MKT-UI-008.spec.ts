import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-008',
  name: '회원 관리 표에 다섯 칸과 위쪽에 「총 {N}명」이 보인다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);

  await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('관리자 화면에서 회원 관리를 연다', async () => {
    await 관리자.열기();
    await 관리자.총인원.waitFor();
    const 표 = await 관리자.회원표.boundingBox();
    const 총 = await 관리자.총인원.boundingBox();
    await verify('회원 관리 표에 아이디 · 이름 · 이메일 · 가입일 · 상태 칸이 보인다', (await 관리자.칸제목들.allInnerTexts()).join(', '), '아이디, 이름, 이메일, 가입일, 상태');
    await verify('회원 관리 표 위에 「총 {N}명」이 보인다', (await 관리자.총인원.isVisible()) && (총?.y ?? 9999) < (표?.y ?? 0), true);
  });
});
