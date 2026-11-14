import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-621',
  name: '상대가 나를 차단했거나 정지된 계정이면 동작 버튼이 비활성이다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
  held: '보류 — 나를 차단한 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    나를차단한계정: z.string().describe('나를 차단한 계정의 사용자명'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('나를 차단한 사람 프로필을 연다', async () => {
    await 프로필열기(driver, params.나를차단한계정);
    await verify('상대가 나를 차단했거나 정지된 계정이면 동작 버튼이 비활성이다', await 프로필.동작버튼켜짐(), 'false');
  }, { capture: true });
});
