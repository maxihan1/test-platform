import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글자굴려찾기 } from './helpers/compose-flow.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-324',
  name: '일반 회원으로 알림 제외 조건 창을 열면 「Admin notifications」가 보이지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    관리알림: z.string().describe('관리자 항목 제목').default('Admin notifications'),
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

  await test.step('일반 회원으로 알림 제외 조건 창을 연다', async () => {
    await verify('알림 제외 조건 창이 열린다', await 알림.정책창열기(), true, { blocker: true });
    await verify('일반 회원으로 알림 제외 조건 창을 열면 「Admin notifications」가 보이지 않는다', await 글자굴려찾기(driver, expected.관리알림), false);
  });
});
