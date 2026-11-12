import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-263',
  name: '「동작 별 필터」에서 「계정 정지」를 고르면 정지 기록 줄만 보인다',
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
  await test.step('감사 로그 화면을 연다', async () => {
    await 감사.열기();
    await verify('감사 로그 화면에 로그 줄이 보인다', await 감사.맨위줄().isVisible(), true, { blocker: true });
  });
  await test.step('「동작 별 필터」에서 「계정 정지」를 고른다', async () => {
    await 감사.동작으로거르기('계정 정지');
    const 있음 = await verify('정지 기록 줄이 보인다', (await 감사.로그줄.count()) > 0, true);
    const 다른줄 = await verify('정지 기록이 아닌 줄이 한 건도 보이지 않는다', await 감사.글이없는줄('정지시켰습니다').count(), 0);
    await verify('「동작 별 필터」에서 「계정 정지」를 고르면 정지 기록 줄만 보인다', 있음 && 다른줄, true);
  });
});
