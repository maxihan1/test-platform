import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-229',
  name: '브랜딩 탭에 「서버 이름」 값 「Mastodon」과 「연락 받을 관리자 사용자명」 · 「연락처 이메일」 · 「서버 설명」 · 「서버 썸네일」 · 「파비콘」 · 「앱 아이콘」 칸이 보인다',
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
    const 이름 = await verify('「서버 이름」 값이 「Mastodon」이다', await 설정.서버이름.inputValue(), 'Mastodon');
    const 관리자 = await verify('「연락 받을 관리자 사용자명」 칸이 보인다', await 설정.연락관리자.isVisible(), true);
    const 메일 = await verify('「연락처 이메일」 칸이 보인다', await 설정.연락이메일.isVisible(), true);
    const 설명 = await verify('「서버 설명」 칸이 보인다', await 설정.서버설명.isVisible(), true);
    const 썸네일 = await verify('「서버 썸네일」 칸이 보인다', await 설정.서버썸네일.isVisible(), true);
    const 파비콘 = await verify('「파비콘」 칸이 보인다', await 설정.파비콘.isVisible(), true);
    const 앱아이콘 = await verify('「앱 아이콘」 칸이 보인다', await 설정.앱아이콘.isVisible(), true);
    await verify('브랜딩 탭에 「서버 이름」 값 「Mastodon」과 「연락 받을 관리자 사용자명」 · 「연락처 이메일」 · 「서버 설명」 · 「서버 썸네일」 · 「파비콘」 · 「앱 아이콘」 칸이 보인다', 이름 && 관리자 && 메일 && 설명 && 썸네일 && 파비콘 && 앱아이콘, true);
  });
});
