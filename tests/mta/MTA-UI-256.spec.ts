import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-256',
  name: '여러 명이 좋아요한 알림이 「및」 · 「개 다른 즐겨찾기」로 묶여 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묶음글: z.string().describe('묶인 알림에 든 글').default('개 다른 즐겨찾기'),
    및: z.string().describe('묶인 알림에 든 글').default('및'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('여러 명이 좋아요한 알림을 찾는다', async () => {
    const 줄 = 알림.굴려서글자포함(expected.묶음글);
    const 묶임 = await verify('묶인 알림이 보인다', await 보이나(driver, 줄), true);
    const 및 = await verify('묶인 알림에 연결 글이 든다', 묶임 && (await driver.$(줄).getText()).includes(expected.및), true);
    await verify('여러 명이 좋아요한 알림이 「및」 · 「개 다른 즐겨찾기」로 묶여 보인다', 묶임 && 및, true);
  });
});
