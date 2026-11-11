import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-236',
  name: '정보 탭에 「확장된 설명」 · 「서버 규칙 관리」 · 「도메인 차단 보여주기」 · 「왜 도메인이 차단되었는지 보여주기」 · 「상태 페이지 URL」 · 「개인정보처리방침」이 보인다',
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

  await test.step('「정보」 탭을 연다', async () => {
    await 설정.열기('about');
    const 설명 = await verify('「확장된 설명」이 보인다', await 설정.확장된설명.isVisible(), true);
    const 규칙 = await verify('「서버 규칙 관리」가 보인다', await 설정.서버규칙관리.isVisible(), true);
    const 차단 = await verify('「도메인 차단 보여주기」가 보인다', await 설정.도메인차단보여주기.isVisible(), true);
    const 이유 = await verify('「왜 도메인이 차단되었는지 보여주기」가 보인다', await 설정.도메인차단이유보여주기.isVisible(), true);
    const 상태 = await verify('「상태 페이지 URL」이 보인다', await 설정.상태페이지.isVisible(), true);
    const 방침 = await verify('「개인정보처리방침」이 보인다', await 설정.개인정보처리방침.isVisible(), true);
    await verify('정보 탭에 「확장된 설명」 · 「서버 규칙 관리」 · 「도메인 차단 보여주기」 · 「왜 도메인이 차단되었는지 보여주기」 · 「상태 페이지 URL」 · 「개인정보처리방침」이 보인다', 설명 && 규칙 && 차단 && 이유 && 상태 && 방침, true);
  });
});
