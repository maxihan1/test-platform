import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-505',
  name: '알림을 일시 중지하면 배너에 「에 알림이 다시 시작됩니다.」와 「지금 재개」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    시간글: z.string().describe('고르는 일시 중단 시간').default('30분'),
    배너글: z.string().describe('일시 중지 배너 글').default('에 알림이 다시 시작됩니다.'),
    재개글: z.string().describe('일시 중지 배너 단추 글').default('지금 재개'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('계정 설정에서 「알림」을 연다', async () => {
      await verify('알림 설정이 열린다', await 설정줄열기(driver, '알림'), true, { blocker: true });
    });
    await test.step('「모두 일시 중지」를 30분으로 켠다', async () => {
      await 설정.스위치바꾸기(0);
      await verify('「모든 알림 일시 중단」 창이 뜬다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간글), 10_000), true, { blocker: true });
      await driver.$(설정.화면글정확히(expected.시간글)).click();
      const 배너 = await verify('배너에 「에 알림이 다시 시작됩니다.」가 보인다', await 뜰때까지(driver, 설정.글포함(expected.배너글), 10_000), true);
      const 재개 = await verify('배너에 「지금 재개」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.재개글), 10_000), true);
      await verify('알림을 일시 중지하면 배너에 「에 알림이 다시 시작됩니다.」와 「지금 재개」가 보인다', 배너 && 재개, true);
    });
  } finally {
    if (await 보이나(driver, 설정.화면글정확히(expected.재개글))) await driver.$(설정.화면글정확히(expected.재개글)).click();
  }
});
