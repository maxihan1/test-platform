import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 권한창답하기, 로그인경로서버고르기, 웹로그인승인 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-095',
  name: '서버 웹 화면에서 이메일과 비밀번호로 로그인하고 승인하면 「인증을 끝마치는 중…」 뒤에 앱 홈이 새로 열린다',
  platforms: ['android'],
  smoke: true,
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

  await test.step('로그인 경로에서 우리 서버를 고르고 「다음」을 누른다', async () => {
    await 로그인경로서버고르기(driver);
  });

  await test.step('로그인 경로로 우리 서버 웹 화면에서 이메일과 비밀번호를 넣고 승인한다', async () => {
    await 웹로그인승인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await 권한창답하기(driver, '허용');
    await verify('서버 웹 화면에서 이메일과 비밀번호로 로그인하고 승인하면 「인증을 끝마치는 중…」 뒤에 앱 홈이 새로 열린다', await 홈.떴나(60_000), true);
  }, { capture: true });
});
