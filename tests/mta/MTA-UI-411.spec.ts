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
  tcId: 'MTA-UI-411',
  name: '「이 서버에 대해서」에 부제 「미리보기, 규칙,」이 보이고 누르면 「에 대해」 · 「규칙」 탭이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    서버줄: z.string().describe('계정 설정 줄 이름').default('이 서버에 대해서'),
    부제글: z.string().describe('줄 부제').default('미리보기, 규칙,'),
    대해탭: z.string().describe('서버 정보 탭 이름의 끝 글').default('에 대해'),
    규칙탭: z.string().describe('서버 정보 탭 이름').default('규칙'),
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
  await test.step('계정 설정에서 「이 서버에 대해서」를 누른다', async () => {
    const 부제 = await verify('「이 서버에 대해서」에 부제 「미리보기, 규칙,」이 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.부제글), 10_000), true);
    await 설정.줄누르기(expected.서버줄);
    const 대해 = await verify('서버 정보 화면에 「에 대해」 탭이 보인다', await 뜰때까지(driver, 설정.글포함(expected.대해탭), 15_000), true);
    const 규칙 = await verify('서버 정보 화면에 「규칙」 탭이 보인다', await 뜰때까지(driver, 설정.글포함(expected.규칙탭), 15_000), true);
    await verify('「이 서버에 대해서」에 부제 「미리보기, 규칙,」이 보이고 누르면 「에 대해」 · 「규칙」 탭이 보인다', 부제 && 대해 && 규칙, true);
  });
});
