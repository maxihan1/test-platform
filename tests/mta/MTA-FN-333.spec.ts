import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-333',
  name: 'Google Play 서비스가 있는 폰에서 둘러보기를 열면 Google Play 서비스가 있는 폰에서는 「QR 코드 스캔」이 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 탐색 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('Google Play 서비스가 있는 폰에서 둘러보기를 연다', async () => {
    await 탐색.열기();
    await verify('Google Play 서비스가 있는 폰에서 둘러보기를 열면 Google Play 서비스가 있는 폰에서는 「QR 코드 스캔」이 보인다', await 탐색.보이나(탐색.QR스캔), true);
  }, { capture: true });
});
