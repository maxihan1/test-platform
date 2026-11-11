import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-489',
  name: '고른 조건의 감사 로그가 없으면 「로그를 찾을 수 없습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
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
  await test.step('감사 로그 화면을 연다', async () => {
    await 감사.열기();
    await verify('감사 로그 화면에 로그 줄이 보인다', await 감사.맨위줄().isVisible(), true, { blocker: true });
  });
  await test.step('「사용자 기준으로 필터」를 qa_mod 로, 「동작 별 필터」를 로그가 없는 동작으로 고른다', async () => {
    await 감사.사용자로거르기('qa_mod');
    await 감사.동작으로거르기('릴레이 생성');
    await verify('고른 조건의 감사 로그가 없으면 「로그를 찾을 수 없습니다」가 보인다', await 감사.빈화면.isVisible(), true);
  });
});
