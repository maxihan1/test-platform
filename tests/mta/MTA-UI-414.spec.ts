import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 꾸러미, 계정줄 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-414',
  name: '계정 설정에서 「계정 삭제」를 누르면 앱 안 브라우저에 「/settings/delete」 화면이 열린다',
  platforms: ['android'],
  held: '보류 — 앱 안 웹 화면은 주소 줄이 없고 팜에 Chromedriver 가 없어 주소를 읽을 길이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    경로: z.string().describe('브라우저 주소 줄에 보일 경로').default('/settings/delete'),
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
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('계정 설정에서 「계정 삭제」를 누른다', async () => {
      await 설정.줄누르기('계정 삭제');
      const 열림 = await verify('앱 안 브라우저 창 주소 줄이 보인다', await 웹.브라우저떴나(), true);
      const 경로 = await verify('브라우저 주소 줄에 「/settings/delete」가 보인다', await 웹.주소에든글자뜰때까지(expected.경로), true);
      await verify('계정 설정에서 「계정 삭제」를 누르면 앱 안 브라우저에 「/settings/delete」 화면이 열린다', 열림 && 경로, true);
    });
  } finally {
    await driver.activateApp(꾸러미);
  }
});
