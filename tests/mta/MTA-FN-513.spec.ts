import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 꾸러미 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-513',
  name: '「추가 설정」을 누르면 브라우저에 「/auth/edit」 화면이 열린다',
  platforms: ['android'],
  held: '보류 — 맞춤 탭 주소 줄에 호스트만 보이고 팜에 Chromedriver 가 없어 경로를 읽을 길이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    경로: z.string().describe('브라우저 주소 줄에 보일 서버 경로').default('/auth/edit'),
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
    await test.step('설정 「Mastodon에 대해」를 연다', async () => {
      await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
      await verify('「Mastodon에 대해」가 열린다', await 설정줄열기(driver, 'Mastodon에 대해'), true, { blocker: true });
    });
    await test.step('「Mastodon에 대해」에서 「추가 설정」을 누른다', async () => {
      await 설정.줄누르기('추가 설정');
      const 열림 = await verify('브라우저 주소 줄이 보인다', await 웹.브라우저떴나(), true);
      const 주소 = await verify('브라우저 주소 줄에 「/auth/edit」가 보인다', await 웹.주소에든글자뜰때까지(expected.경로), true);
      await verify('「추가 설정」을 누르면 브라우저에 「/auth/edit」 화면이 열린다', 열림 && 주소, true);
    });
  } finally {
    await driver.activateApp(꾸러미);
  }
});
