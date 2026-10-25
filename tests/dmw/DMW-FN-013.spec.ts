import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-013',
  name: '홈 화면을 열고 10초가 지나면 알림 수를 다시 가져오는 요청이 나간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 계정으로로그인(page, params.loginId, params.loginPassword);
  await page.clock.install();

  await test.step('홈 화면을 열고 10초를 보낸다', async () => {
    await 홈.열기();
    await 홈.머리.알림종.waitFor();
    await verify('회원으로 로그인해 있다', await 홈.머리.알림종.isVisible(), true, { blocker: true });
    const 알림요청 = (주소: string): boolean => 주소.includes('/api/notifications') && !주소.includes('/read');
    const 요청들 = await 보낸요청끝날때까지(page, () => page.clock.runFor(10_000), 알림요청);
    await verify('홈 화면을 열고 10초가 지나면 알림 수를 다시 가져오는 요청이 나간다', 요청들.length >= 1, true);
  });
});
