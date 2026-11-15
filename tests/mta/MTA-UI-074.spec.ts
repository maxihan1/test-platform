import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 웹승인화면까지가기 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-074',
  name: '로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 웹 = new 웹로그인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('로그인 경로에서 서버를 고르고 승인 화면을 연다', async () => {
    await 웹승인화면까지가기(driver, params.loginId, params.loginPassword);
    await verify('승인 화면 「승인」 버튼이 보인다', await 웹.승인화면떴나(), true, { blocker: true });
    await verify('로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다', await 웹.앱이름떴나(), true);
  });
});
