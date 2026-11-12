import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-021',
  name: '감사 로그가 40건을 넘을 때 「감사 로그」 화면을 열면 첫 페이지에 로그 줄이 40건 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 줄수: z.number().describe('첫 페이지 로그 줄 수').default(40) }),
});

test(spec, async ({ page, params, expected }) => {
  const 프로필 = new 공개프로필화면(page);
  const 감사 = new 감사로그화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「감사 로그」 화면을 연다', async () => {
    await 감사.열기();
    await verify('감사 로그가 40건을 넘을 때 「감사 로그」 화면을 열면 첫 페이지에 로그 줄이 40건 보인다', await 감사.로그줄.count(), expected.줄수);
  });
});
