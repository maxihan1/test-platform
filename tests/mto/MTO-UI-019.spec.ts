import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-019',
  name: '대시보드 오른쪽 위에 오늘로 끝나는 30일 기간이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 기간일수: z.number().describe('기간 일수').default(30) }),
});

test(spec, async ({ page, params, expected }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    const 오늘 = new Date();
    const 끝 = 오늘.toISOString().slice(0, 10);
    const 시작 = new Date(오늘.getTime() - (expected.기간일수 - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const 보임 = await verify('대시보드 오른쪽 위에 기간이 보인다', await 대시보드.기간.isVisible(), true);
    const 기간 = await verify('기간이 오늘로 끝나는 30일이다', (await 대시보드.기간.innerText()).trim(), `${시작} - ${끝}`);
    await verify('대시보드 오른쪽 위에 오늘로 끝나는 30일 기간이 보인다', 보임 && 기간, true);
  });
});
