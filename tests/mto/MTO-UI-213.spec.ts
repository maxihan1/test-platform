import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-213',
  name: '감사 로그 화면에 「사용자 기준으로 필터」 · 「동작 별 필터」와 문장 · 시각이 든 로그 줄이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 감사 = new 감사로그화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「감사 로그」 화면을 연다', async () => {
    await 감사.열기();
    const 사용자 = await verify('「사용자 기준으로 필터」가 보인다', await 감사.사용자필터글.isVisible(), true);
    const 동작 = await verify('「동작 별 필터」가 보인다', await 감사.동작필터글.isVisible(), true);
    const 문장 = await verify('문장이 든 로그 줄이 보인다', await 감사.맨위줄().isVisible(), true);
    const 시각 = await verify('로그 줄에 시각이 보인다', await 감사.맨위시각.isVisible(), true);
    await verify('감사 로그 화면에 「사용자 기준으로 필터」 · 「동작 별 필터」와 문장 · 시각이 든 로그 줄이 보인다', 사용자 && 동작 && 문장 && 시각, true);
  });
});
