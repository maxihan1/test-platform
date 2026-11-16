import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글자굴려찾기 } from './helpers/compose-flow.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-323',
  name: '관리자 계정으로 알림 제외 조건 창을 열면 「Admin notifications」 · 「Admin reports」 · 「Account signups」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('adminId', 'adminPassword'),
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: z.object({
    관리알림: z.string().describe('관리자 항목 제목').default('Admin notifications'),
    신고: z.string().describe('관리자 항목 제목').default('Admin reports'),
    가입: z.string().describe('관리자 항목 제목').default('Account signups'),
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

  await test.step('관리자 계정으로 알림 제외 조건 창을 연다', async () => {
    await verify('알림 제외 조건 창이 열린다', await 알림.정책창열기(), true, { blocker: true });
    const 관리알림 = await verify('「Admin notifications」가 보인다', await 글자굴려찾기(driver, expected.관리알림), true);
    const 신고 = await verify('「Admin reports」가 보인다', await 글자굴려찾기(driver, expected.신고), true);
    const 가입 = await verify('「Account signups」가 보인다', await 글자굴려찾기(driver, expected.가입), true);
    await verify('관리자 계정으로 알림 제외 조건 창을 열면 「Admin notifications」 · 「Admin reports」 · 「Account signups」가 보인다', 관리알림 && 신고 && 가입, true);
  });
});
