import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스크롤해서찾았나 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-143',
  name: '앱에 로그인해 홈을 열면 홈 목록에 필터 「스포일러」에 걸린 글은 「“스포일러” 필터와 일치함」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 로그인해 홈을 연다', async () => {
    await verify('앱에 로그인해 홈을 열면 홈 목록에 필터 「스포일러」에 걸린 글은 「“스포일러” 필터와 일치함」으로 보인다', await 스크롤해서찾았나(driver, '“스포일러” 필터와 일치함'), true);
  }, { capture: true });
});
