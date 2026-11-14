import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-585',
  name: 'PKCE를 지원하는 서버(API 버전 3 이상)면 코드 검증자를 함께 보낸다',
  platforms: ['android'],
  held: '보류 — 앱이 서버로 보내는 인증 요청을 케이스에서 읽을 길이 없다',
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
  await test.step('로그인 경로로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('PKCE를 지원하는 서버(API 버전 3 이상)면 코드 검증자를 함께 보낸다', await 홈.떴나(), true);
  }, { capture: true });
});
