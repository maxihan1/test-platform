import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 글이될때까지읽기, 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-UI-438',
  name: '「게시 언어」를 누르면 언어 목록과 「취소」가 있는 창이 뜬다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    목록글: z.string().describe('언어 창 목록의 첫 줄 이름').default('기본값'),
    취소글: z.string().describe('언어 창 단추 글').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「게시 기본값」을 연다', async () => {
    await verify('게시 기본값 화면이 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
  });
  await test.step('게시 기본값에서 「게시 언어」를 누른다', async () => {
    await 설정.줄누르기('게시 언어');
    const 목록 = await verify('언어 창에 언어 목록이 보인다', await 뜰때까지(driver, 설정.글포함(expected.목록글), 10_000), true);
    const 취소 = await verify('언어 창에 「취소」가 보인다', await 글이될때까지읽기(driver, 창.확인버튼, expected.취소글), expected.취소글);
    await verify('「게시 언어」를 누르면 언어 목록과 「취소」가 있는 창이 뜬다', 목록 && 취소, true);
    await 창.확인();
  });
});
