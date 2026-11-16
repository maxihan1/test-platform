import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-246',
  name: '알림 화면에 탭 「모든 것」 · 「멘션」이 보이고 「모든 것」이 선택돼 있다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    모든것: z.string().describe('첫째 탭 글자').default('모든 것'),
    멘션: z.string().describe('둘째 탭 글자').default('멘션'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('하단 「알림」 탭을 누른다', async () => {
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
    const 모든것 = await verify('첫째 탭 글자가 기대값과 같다', await driver.$(알림.모든것글).getText(), expected.모든것);
    const 멘션 = await verify('둘째 탭 글자가 기대값과 같다', await driver.$(알림.멘션글).getText(), expected.멘션);
    const 선택 = await verify('첫째 탭이 선택돼 있다', await 알림.선택됨('all'), true);
    await verify('알림 화면에 탭 「모든 것」 · 「멘션」이 보이고 「모든 것」이 선택돼 있다', 모든것 && 멘션 && 선택, true);
  });
});
