import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림탭목록떴나 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-128',
  name: '로그인할 때 알림 권한 창에서 「허용 안함」을 누르고 「알림」 탭을 열면 알림 권한을 거부해도 「알림」 탭 목록이 열린다',
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
  await test.step('로그인할 때 알림 권한 창에서 「허용 안함」을 누르고 「알림」 탭을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword, '거부');
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
    await 홈.탭.누르기('알림');
    await verify('로그인할 때 알림 권한 창에서 「허용 안함」을 누르고 「알림」 탭을 열면 알림 권한을 거부해도 「알림」 탭 목록이 열린다', await 알림탭목록떴나(driver), true);
  }, { capture: true });
});
