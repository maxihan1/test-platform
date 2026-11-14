import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switch.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-464',
  name: '계정 전환 시트 「계정 추가」는 시작 화면으로 가서 다른 서버나 계정으로 로그인한다',
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
  const 전환 = new 계정전환시트(driver);
  const 시작 = new 시작화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('계정 전환 시트에서 「계정 추가」를 누른다', async () => {
    await 전환.열기();
    await verify('계정 전환 시트가 뜬다', await 전환.떴나(), true);
    await 전환.계정추가누르기();
    await verify('계정 전환 시트 「계정 추가」는 시작 화면으로 가서 다른 서버나 계정으로 로그인한다', await 시작.떴나(30_000), true);
  }, { capture: true });
});
