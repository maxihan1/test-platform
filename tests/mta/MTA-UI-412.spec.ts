import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-412',
  name: '「이 서버에 대해서」 화면에 「관리자」 · 「관리자에게 메세지 보내기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    서버줄: z.string().describe('계정 설정 줄 이름').default('이 서버에 대해서'),
    규칙탭: z.string().describe('서버 정보 탭 이름').default('규칙'),
    관리자글: z.string().describe('관리자 정보가 있을 때만 나오는 글').default('관리자'),
    메세지글: z.string().describe('문의 이메일이 있을 때만 나오는 글').default('관리자에게 메세지 보내기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('「이 서버에 대해서」 화면을 연다', async () => {
    await 설정.줄누르기(expected.서버줄);
    await verify('서버 정보 화면의 「규칙」 탭이 보인다', await 뜰때까지(driver, 설정.글포함(expected.규칙탭), 15_000), true, { blocker: true });
    const 관리자 = await verify('「이 서버에 대해서」 화면에 「관리자」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.관리자글), 10_000), true);
    const 메세지 = await verify('「이 서버에 대해서」 화면에 「관리자에게 메세지 보내기」가 보인다', await 뜰때까지(driver, 설정.글포함(expected.메세지글), 10_000), true);
    await verify('「이 서버에 대해서」 화면에 「관리자」 · 「관리자에게 메세지 보내기」가 보인다', 관리자 && 메세지, true);
  });
});
