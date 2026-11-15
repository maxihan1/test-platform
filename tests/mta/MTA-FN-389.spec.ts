import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-389',
  name: '나를 차단한 사람 프로필을 열면 동작 버튼이 꺼져 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('나를 차단한 blocker_baek 프로필을 연다', async () => {
    await 프로필열기(driver, 'blocker_baek');
    await verify('나를 차단한 사람 프로필을 열면 동작 버튼이 꺼져 보인다', await 프로필.동작켜졌나(), false);
  });
});
