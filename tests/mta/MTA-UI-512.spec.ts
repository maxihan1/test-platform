import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-512',
  name: '상대만 나를 팔로우하면 동작 버튼은 「맞팔로우」다',
  platforms: ['android'],
  held: '보류 — 나를 팔로우하고 내가 팔로우하지 않는 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    맞팔로우계정: z.string().describe('나를 팔로우하고 내가 팔로우하지 않는 계정의 사용자명'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('나만 팔로우하는 사람 프로필을 연다', async () => {
    await 프로필열기(driver, params.맞팔로우계정);
    await verify('상대만 나를 팔로우하면 동작 버튼은 「맞팔로우」다', await 프로필.동작버튼글(), '맞팔로우');
  }, { capture: true });
});
