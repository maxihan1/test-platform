import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그아웃하기, 로그인하기 } from './helpers/login.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-166',
  name: '홈에서 「s」를 치면 검색칸에 커서가 간다',
  precondition: ['일반 회원으로 로그인해 있다', '비회원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);

  await test.step('비회원으로 로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 로그아웃하기(page);
    await 검색.열기('');
    await verify('로그인 전 왼쪽 열에 「검색」 칸이 보인다', await 검색.검색칸.isVisible(), true);
  });

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈 제목이 보인다', await 홈.제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈에서 「s」를 친다', async () => {
    await 검색.단축키누르기('s');
    await verify('홈에서 「s」를 치면 검색칸에 커서가 간다', await 검색.커서가있는가(), true);
  });
});
