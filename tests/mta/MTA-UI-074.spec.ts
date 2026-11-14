import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 웹거부누르기, 웹승인화면까지 } from './helpers/onboarding.helper.js';
import { 로그인경로서버고르기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-074',
  name: '로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로로 우리 서버 웹 로그인까지 마친다', async () => {
    await 로그인경로서버고르기(driver);
    await 웹승인화면까지(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인 승인 화면에 앱 이름 「Mastodon for Android」가 보인다', await 문구가보이나(driver, 'Mastodon for Android'), true);
  }, { capture: true });
  await test.step('웹 승인 화면에서 「거부」를 눌러 앱으로 돌아간다', async () => {
    await 웹거부누르기(driver);
  });
});
