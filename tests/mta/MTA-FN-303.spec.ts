import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 앱다시켜기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 꾸러미 } from './helpers/app.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-303',
  name: '알림 「멘션」 탭을 고른 뒤 앱을 다시 켜고 알림 화면을 열면 「멘션」 탭이 선택돼 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 알림 = new 알림화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('알림 「멘션」 탭을 고른 뒤 앱을 다시 켠다', async () => {
    await 알림.멘션탭누르기();
    await verify('「멘션」 탭이 선택돼 있다', await 될때까지(driver, async () => 알림.선택됨('mentions'), 10_000), true, { blocker: true });
    await 앱다시켜기(driver, 꾸러미);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('앱을 다시 켜고 알림 화면을 연다', async () => {
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
    await verify('알림 「멘션」 탭을 고른 뒤 앱을 다시 켜고 알림 화면을 열면 「멘션」 탭이 선택돼 있다', await 알림.선택됨('mentions'), true);
  });
});
