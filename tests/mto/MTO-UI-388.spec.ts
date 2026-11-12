import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행링크화면 } from './pages/trends-links.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-388',
  name: '「유행하는 링크」에서 「발행처」를 누르면 발행처 화면으로 간다',
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
  const 유행링크 = new 유행링크화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「유행하는 링크」 화면에서 「발행처」를 누른다', async () => {
    await 유행링크.열기();
    await 관리.누르기(유행링크.발행처);
    await verify('「유행하는 링크」에서 「발행처」를 누르면 발행처 화면으로 간다', await 관리.제목이('발행처').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
