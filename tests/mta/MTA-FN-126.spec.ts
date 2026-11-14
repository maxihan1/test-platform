import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 권한창떴나 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-126',
  name: '알림 권한을 이미 허용했으면 앱을 다시 켤 때 권한을 요청하지 않는다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('알림 권한을 허용한 뒤 앱을 끄고 다시 켠다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword, '허용');
    await 앱다시켜기(driver);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
    await verify('알림 권한을 이미 허용했으면 앱을 다시 켤 때 권한을 요청하지 않는다', await 권한창떴나(driver, 5_000), false);
  }, { capture: true });
});
