import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-625',
  name: '프로필 항목을 끌어 순서를 바꾸면 프로필 항목은 끌어서 순서를 바꾼다',
  platforms: ['android'],
  held: '보류 — 프로필 항목 손잡이를 잡을 요소 주소',
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

  await test.step('프로필 항목을 끌어 순서를 바꾼다', async () => {
    await verify('프로필 항목을 끌어 순서를 바꾸면 프로필 항목은 끌어서 순서를 바꾼다', await 홈.떴나(), true);
  });
});
