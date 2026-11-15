import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-318',
  name: '관리자 계정으로 알림 화면을 열면 「signed up」 가입 알림이 보인다',
  platforms: ['android'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: z.object({
    가입글: z.string().describe('가입 알림 글').default('signed up'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('관리자 계정으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.adminId, params.adminPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('관리자 계정으로 알림 화면을 연다', async () => {
    await verify('관리자 계정으로 알림 화면을 열면 「signed up」 가입 알림이 보인다', await 보이나(driver, 알림.굴려서글자포함(expected.가입글)), true);
  });
});
