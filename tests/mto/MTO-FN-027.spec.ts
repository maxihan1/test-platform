import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-027',
  name: 'Owner 가 대시보드를 열면 서버 규칙 경고가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '서버 규칙이 하나도 없다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);
  const 서버규칙 = new 서버규칙화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('서버 규칙이 하나도 없는지 확인한다', async () => {
    await 서버규칙.열기();
    await verify('서버 규칙이 하나도 없다', await 서버규칙.빈목록.isVisible(), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    await verify('Owner 가 대시보드를 열면 서버 규칙 경고가 보인다', await 대시보드.규칙경고.isVisible(), true);
  });
});
