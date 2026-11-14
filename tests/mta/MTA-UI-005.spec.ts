import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 계정전환시트떴나, 계정전환시트열기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-005',
  name: '「프로필」 탭을 길게 누르면 계정 전환 시트가 뜬다',
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
  await test.step('「프로필」 탭을 길게 누른다', async () => {
    await 계정전환시트열기(driver);
    await verify('「프로필」 탭을 길게 누르면 계정 전환 시트가 뜬다', await 계정전환시트떴나(driver), true);
    await 뒤로(driver);
  }, { capture: true });
});
