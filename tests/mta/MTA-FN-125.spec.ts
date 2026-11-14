import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 권한창떴나 } from './helpers/onboarding.helper.js';
import { 권한창답하기, 로그인경로서버고르기, 웹로그인승인 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-125',
  name: 'Android 13 이상에서 앱이 켜질 때 알림 권한이 없으면 권한을 요청한다',
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
  await test.step('Android 13 이상 폰에서 로그인한다', async () => {
    await 로그인경로서버고르기(driver);
    await 웹로그인승인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('Android 13 이상에서 앱이 켜질 때 알림 권한이 없으면 권한을 요청한다', await 권한창떴나(driver, 60_000), true);
    await 권한창답하기(driver, '허용');
  }, { capture: true });
});
