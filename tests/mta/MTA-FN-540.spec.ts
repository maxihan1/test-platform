import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정줄 } from './helpers/app.helper.js';
import { 계정추가로그인 } from './helpers/signup-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switcher.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-540',
  name: '두 계정을 넣은 앱에서 두 번째 사용자로 바꾸면 홈 드롭다운 목록에 그 계정 목록 「사진」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    목록이름: z.string().describe('두 번째 사용자 목록 이름').default('사진'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 계정전환시트(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('일반 회원과 두 번째 사용자를 넣고 계정마다 목록을 연다', async () => {
    await 계정추가로그인(driver, params.secondId, params.secondPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 시트.열기();
    await 시트.계정고르기(계정줄(params.secondId ?? ''));
    await verify('두 번째 사용자 홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 홈.드롭다운열기();
    await 홈.메뉴.고르기('목록');
    await verify('두 계정을 넣은 앱에서 두 번째 사용자로 바꾸면 홈 드롭다운 목록에 그 계정 목록 「사진」이 보인다', await 홈.메뉴.뜰때까지(expected.목록이름), true);
  });
});
