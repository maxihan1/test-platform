import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-006',
  name: '관리 화면 사이드바에 일반 설정 메뉴 「공개 프로필」 아래로 「중재」 · 「관리」 묶음이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    await 관리.사이드바.그려질때까지();
    const 프로필메뉴 = await verify('일반 설정 메뉴 「공개 프로필」이 보인다', await 관리.사이드바.메뉴('공개 프로필').isVisible(), true);
    const 중재 = await verify('「중재」 묶음이 보인다', await 관리.사이드바.중재.isVisible(), true);
    const 관리묶음 = await verify('「관리」 묶음이 보인다', await 관리.사이드바.관리.isVisible(), true);
    const 메뉴들 = (await 관리.사이드바링크들.allInnerTexts()).map((t) => t.trim());
    const 순서 = await verify('「중재」 · 「관리」 묶음이 「공개 프로필」 아래에 있다', 메뉴들.indexOf('공개 프로필') < 메뉴들.indexOf('중재') && 메뉴들.indexOf('중재') < 메뉴들.indexOf('관리'), true);
    await verify('관리 화면 사이드바에 일반 설정 메뉴 「공개 프로필」 아래로 「중재」 · 「관리」 묶음이 보인다', 프로필메뉴 && 중재 && 관리묶음 && 순서, true);
  });
});
