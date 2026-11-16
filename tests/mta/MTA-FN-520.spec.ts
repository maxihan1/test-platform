import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 꾸러미, 글읽기 } from './helpers/app.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-520',
  name: '「링크 열기」가 「앱내 브라우저」면 링크가 앱 안 브라우저 창(크롬 맞춤 탭)으로 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    기본글: z.string().describe('링크 열기 설정 값').default('앱내 브라우저'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 웹 = new 웹로그인화면(driver);
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('설정 「동작」에서 「링크 열기」를 확인한다', async () => {
      await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
      await verify('「동작」 설정이 열린다', await 설정줄열기(driver, '동작'), true, { blocker: true });
      await verify('「링크 열기」가 「앱내 브라우저」다', (await 글읽기(driver, 설정.부제)).trim(), expected.기본글, { blocker: true });
      await driver.back();
      await verify('「Mastodon에 대해」가 열린다', await 설정줄열기(driver, 'Mastodon에 대해'), true, { blocker: true });
    });
    await test.step('「링크 열기」가 「앱내 브라우저」인 채 「추가 설정」을 누른다', async () => {
      await 설정.줄누르기('추가 설정');
      await verify('브라우저 주소 줄이 보인다', await 웹.브라우저떴나(), true, { blocker: true });
      await verify('「링크 열기」가 「앱내 브라우저」면 링크가 앱 안 브라우저 창(크롬 맞춤 탭)으로 열린다', await 웹.맞춤탭인가(), true);
    });
  } finally {
    await driver.activateApp(꾸러미);
  }
});
