import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-340',
  name: '둘러보기에서 같은 탭을 다시 누르면 맨 위로 올라간다',
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
  const 탐색 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('둘러보기 목록을 내린 뒤 같은 탭을 다시 누른다', async () => {
    await 탐색.열기();
    await 탐색.내리기(4);
    await 탐색.같은탭다시누르기();
    await verify('둘러보기에서 같은 탭을 다시 누르면 맨 위로 올라간다', await 탐색.보이나(탐색.배너), true);
  }, { capture: true });
});
