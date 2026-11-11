import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-396',
  name: '실험 기능이 꺼진 서버의 사이드바 「관리」 묶음에는 「FASP」가 보이지 않는다',
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
    const 묶음 = await verify('「관리」 묶음에 메뉴가 보인다', await 관리.묶음메뉴들('관리').first().isVisible(), true);
    const 보이지않음 = await verify('「관리」 묶음에 「FASP」가 보이지 않는다', await 관리.묶음메뉴('관리', 'FASP').isVisible(), false);
    await verify('실험 기능이 꺼진 서버의 사이드바 「관리」 묶음에는 「FASP」가 보이지 않는다', 묶음 && 보이지않음, true);
  });
});
