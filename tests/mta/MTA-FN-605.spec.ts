import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시스템링크열기 } from './helpers/signup-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-605',
  name: '우리 서버 계정 주소를 열면 앱 선택 창이나 브라우저가 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주소: z.string().describe('시스템에서 열 서버 계정 주소 — 우리 서버의 계정 주소').default('https://mastodon.maxihan.com/@hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 웹 = new 웹로그인화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('시스템에서 https://mastodon.maxihan.com/@hana_photo 주소를 연다', async () => {
    await 시스템링크열기(driver, params.주소);
    await verify('우리 서버 계정 주소를 열면 앱 선택 창이나 브라우저가 열린다', await 웹.앱선택창이나브라우저떴나(), true);
  });
});
