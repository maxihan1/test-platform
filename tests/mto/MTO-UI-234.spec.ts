import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-234',
  name: '「새 방문자를 위한 랜딩 페이지」에 「정보 페이지」 · 「로컬 실시간 피드」 · 「개요」 · 「유행중」이 보인다',
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

  await test.step('「브랜딩」 탭을 연다', async () => {
    await 설정.열기('branding');
    const 선택1 = await verify('「정보 페이지」가 보인다', await 설정.랜딩선택지('정보 페이지').isVisible(), true);
    const 선택2 = await verify('「로컬 실시간 피드」가 보인다', await 설정.랜딩선택지('로컬 실시간 피드').isVisible(), true);
    const 선택3 = await verify('「개요」가 보인다', await 설정.랜딩선택지('개요').isVisible(), true);
    const 선택4 = await verify('「유행중」가 보인다', await 설정.랜딩선택지('유행중').isVisible(), true);
    await verify('「새 방문자를 위한 랜딩 페이지」에 「정보 페이지」 · 「로컬 실시간 피드」 · 「개요」 · 「유행중」이 보인다', 선택1 && 선택2 && 선택3 && 선택4, true);
  });
});
