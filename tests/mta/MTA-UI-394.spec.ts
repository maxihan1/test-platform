import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-394',
  name: '「링크 열기」 기본값이 「앱내 브라우저」로 보이고 누르면 「앱내 브라우저」 · 「시스템 브라우저」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    기본글: z.string().describe('링크 열기 기본값').default('앱내 브라우저'),
    다른글: z.string().describe('링크 열기 선택지').default('시스템 브라우저'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「동작」을 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「동작」 설정이 열린다', await 설정줄열기(driver, '동작'), true, { blocker: true });
  });
  await test.step('설정 「동작」의 「링크 열기」를 누른다', async () => {
    const 기본 = await verify('「링크 열기」 기본값이 「앱내 브라우저」로 보인다', (await 글읽기(driver, 설정.부제)).trim(), expected.기본글);
    await 설정.줄누르기('링크 열기');
    const 앱내 = await verify('「링크 열기」 선택지에 「앱내 브라우저」가 보인다', await 뜰때까지(driver, 설정.글포함(expected.기본글), 10_000), true);
    const 시스템 = await verify('「링크 열기」 선택지에 「시스템 브라우저」가 보인다', await 뜰때까지(driver, 설정.글포함(expected.다른글), 10_000), true);
    await verify('「링크 열기」 기본값이 「앱내 브라우저」로 보이고 누르면 「앱내 브라우저」 · 「시스템 브라우저」가 보인다', 기본 && 앱내 && 시스템, true);
  });
});
