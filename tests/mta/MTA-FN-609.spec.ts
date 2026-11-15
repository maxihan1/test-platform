import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시작화면열기 } from './helpers/login.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-609',
  name: '사용자 인증서로 서명한 서버를 고르면 그 서버에 접속한다',
  platforms: ['android'],
  held: '보류 — 사용자 인증서로 서명한 Mastodon 서버가 없다',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버주소: z.string().describe('접속할 서버 주소 — 사용자 인증서로 서명한 Mastodon 서버'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 고르기 = new 서버고르기화면(driver);
  const 웹 = new 웹로그인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('사용자 인증서로 서명한 서버에 접속한다', async () => {
    await 시작.누르기('로그인');
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await 고르기.적기(params.서버주소);
    await 고르기.카드누르기(params.서버주소);
    await verify('「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
    await 고르기.다음누르기();
    await verify('사용자 인증서로 서명한 서버를 고르면 그 서버에 접속한다', await 웹.브라우저떴나(), true);
  });
});
