import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-498',
  name: '「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에 「30분」 · 「1시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    창제목: z.string().describe('알림 일시 중단 창 제목').default('모든 알림 일시 중단'),
    시간1: z.string().describe('알림 일시 중단 선택지').default('30분'),
    시간2: z.string().describe('알림 일시 중단 선택지').default('1시간'),
    시간3: z.string().describe('알림 일시 중단 선택지').default('12시간'),
    시간4: z.string().describe('알림 일시 중단 선택지').default('1일'),
    시간5: z.string().describe('알림 일시 중단 선택지').default('3일'),
    시간6: z.string().describe('알림 일시 중단 선택지').default('1 주'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
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
  await test.step('알림 설정에서 「모두 일시 중지」를 켠다', async () => {
    await 설정.스위치바꾸기(0);
    const 제목 = await verify('「모든 알림 일시 중단」 창이 뜬다', await 뜰때까지(driver, 설정.글포함(expected.창제목), 10_000), true);
    const 보임1 = await verify('일시 중단 창에 「30분」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간1), 10_000), true);
    const 보임2 = await verify('일시 중단 창에 「1시간」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간2), 10_000), true);
    const 보임3 = await verify('일시 중단 창에 「12시간」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간3), 10_000), true);
    const 보임4 = await verify('일시 중단 창에 「1일」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간4), 10_000), true);
    const 보임5 = await verify('일시 중단 창에 「3일」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간5), 10_000), true);
    const 보임6 = await verify('일시 중단 창에 「1 주」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.시간6), 10_000), true);
    await verify('「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에 「30분」 · 「1시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」가 보인다', 제목 && 보임1 && 보임2 && 보임3 && 보임4 && 보임5 && 보임6, true);
    await driver.back();
  });
});
