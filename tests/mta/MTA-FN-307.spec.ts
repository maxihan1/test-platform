import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-307',
  name: '「님이 나를 팔로우했습니다」 팔로우 알림을 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    팔로워: z.string().min(1).describe('팔로우 알림을 보낸 사용자명 — 나를 팔로우한 시드 계정').default('qa_user2'),
  }),
  expected: z.object({
    팔로우글: z.string().describe('팔로우 알림 글').default(' 님이 나를 팔로우했습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('팔로우 알림을 누른다', async () => {
    const 줄 = 알림.목록글자포함(params.팔로워 + expected.팔로우글);
    await verify('팔로우 알림이 보인다', await 뜰때까지(driver, 줄, 15_000), true, { blocker: true });
    await driver.$(줄).click();
    const 열림 = await verify('프로필 화면이 열린다', await 프로필.그려질때까지(), true);
    const 계정 = await verify('프로필 계정이 알림을 보낸 사람이다', (await driver.$(프로필.계정).getText()).includes('@' + params.팔로워), true);
    await verify('「님이 나를 팔로우했습니다」 팔로우 알림을 누르면 그 사람 프로필이 열린다', 열림 && 계정, true);
  });
});
