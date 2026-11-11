import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-010',
  name: 'Owner 의 사이드바 「관리」 묶음에 「대시보드」부터 「릴레이」까지 메뉴 열한 개가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 메뉴수: z.number().describe('관리 묶음 메뉴 수').default(11) }),
});

test(spec, async ({ page, params, expected }) => {
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
    const 메뉴들 = (await 관리.묶음메뉴들('관리').allInnerTexts()).map((t) => t.trim());
    const 처음 = await verify('「관리」 묶음 첫 메뉴가 「대시보드」다', 메뉴들[0], '대시보드');
    const 끝 = await verify('「관리」 묶음 마지막 메뉴가 「릴레이」다', 메뉴들[메뉴들.length - 1], '릴레이');
    const 개수 = await verify('「관리」 묶음에 메뉴 열한 개가 보인다', 메뉴들.length, expected.메뉴수);
    await verify('Owner 의 사이드바 「관리」 묶음에 「대시보드」부터 「릴레이」까지 메뉴 열한 개가 보인다', 처음 && 끝 && 개수, true);
  });
});
