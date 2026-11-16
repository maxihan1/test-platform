import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-488',
  name: '관리자 계정의 앱 설정에도 신고 처리 · 계정 관리 메뉴가 보이지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    loginPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: z.object({
    신고글: z.string().describe('앱에 없는 메뉴 이름').default('신고 처리'),
    관리글: z.string().describe('앱에 없는 메뉴 이름').default('계정 관리'),
    구획글: z.string().describe('설정 화면에 늘 있는 구획 이름').default('앱 설정'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('관리자 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('관리자 계정으로 설정을 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('설정 화면에 「앱 설정」 구획이 보인다', await 뜰때까지(driver, 설정.줄(expected.구획글), 10_000), true, { blocker: true });
    const 신고 = await verify('설정에 신고 처리 메뉴가 보이지 않는다', await 보이나(driver, 설정.줄(expected.신고글)), false);
    const 관리 = await verify('설정에 계정 관리 메뉴가 보이지 않는다', await 보이나(driver, 설정.줄(expected.관리글)), false);
    await verify('관리자 계정의 앱 설정에도 신고 처리 · 계정 관리 메뉴가 보이지 않는다', 신고 && 관리, true);
  });
});
