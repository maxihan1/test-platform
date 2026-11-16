import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 글이될때까지읽기, 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-470',
  name: '「테마-화면 스타일」 기본값이 「기기 모드에 맞춰 자동 적용」이고 「어두움」을 고르면 부제가 「어두움」으로 바뀐다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    기본테마: z.string().describe('테마 기본값').default('기기 모드에 맞춰 자동 적용'),
    고른테마: z.string().describe('고르는 테마').default('어두움'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「디스플레이」를 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「디스플레이」 설정이 열린다', await 설정줄열기(driver, '디스플레이'), true, { blocker: true });
  });
  await test.step('설정 「디스플레이」의 「테마-화면 스타일」에서 「어두움」을 고른다', async () => {
    const 기본 = await verify('「테마-화면 스타일」 기본값이 「기기 모드에 맞춰 자동 적용」이다', await 글읽기(driver, 설정.부제), expected.기본테마);
    await 설정.줄누르기('테마-화면 스타일');
    await driver.$(설정.화면글정확히(expected.고른테마)).click();
    const 바뀜 = await verify('테마 부제가 「어두움」으로 바뀐다', await 글이될때까지읽기(driver, 설정.부제, expected.고른테마), expected.고른테마);
    await verify('「테마-화면 스타일」 기본값이 「기기 모드에 맞춰 자동 적용」이고 「어두움」을 고르면 부제가 「어두움」으로 바뀐다', 기본 && 바뀜, true);
  });
});
