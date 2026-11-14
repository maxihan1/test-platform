import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 홈오류화면 } from './pages/home-error.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-988',
  name: 'API 응답이 호출 한도 초과(429)면 「빈도 제한됨」 안내가 보인다',
  precondition: ['웹 앱 API 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 홈오류 = new 홈오류화면(page);
  let 풀기함수: 풀기 | undefined;

  await test.step('일반 회원으로 로그인하고 홈 응답을 호출 한도 초과로 바꾼다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    풀기함수 = await 가짜응답(page, /\/api\/v1\/timelines\/home/, { 상태: 429, 본문: { error: 'Too many requests' } });
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('호출 한도 초과 응답이 오는 동작을 한다', async () => {
      await 홈오류.열기();
      await verify('API 응답이 호출 한도 초과(429)면 「빈도 제한됨」 안내가 보인다', await 홈오류.안내뜰때까지(), true);
    });
  } finally {
    if (풀기함수 !== undefined) await 풀기함수();
  }
});
