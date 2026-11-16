import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 목록만들기화면열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-355',
  name: '목록 만들기 1단계에 「2개 중 1번째 단계」 · 「목록 이름」 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「만들기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    단계글: z.string().describe('목록 만들기 1단계 글').default('2개 중 1번째 단계'),
    이름글: z.string().describe('목록 만들기 1단계 글').default('목록 이름'),
    답장글: z.string().describe('목록 만들기 1단계 글').default('답장을 표시할 대상:'),
    숨기기글: z.string().describe('목록 만들기 1단계 글').default('팔로우 중인 구성원 숨기기'),
    만들기글: z.string().describe('목록 만들기 1단계 단추 글').default('만들기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('「목록 만들기」를 누른다', async () => {
    await verify('목록 만들기 1단계 화면이 열린다', await 목록만들기화면열기(driver), true, { blocker: true });
    const 보임1 = await verify('1단계에 「2개 중 1번째 단계」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.단계글), 10_000), true);
    const 보임2 = await verify('1단계에 「목록 이름」이 보인다', await 뜰때까지(driver, 목록.화면글(expected.이름글), 10_000), true);
    const 보임3 = await verify('1단계에 「답장을 표시할 대상:」이 보인다', await 뜰때까지(driver, 목록.화면글(expected.답장글), 10_000), true);
    const 보임4 = await verify('1단계에 「팔로우 중인 구성원 숨기기」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.숨기기글), 10_000), true);
    const 보임5 = await verify('1단계에 「만들기」가 보인다', await 뜰때까지(driver, 목록.만들기, 10_000), true);
    await verify('목록 만들기 1단계에 「2개 중 1번째 단계」 · 「목록 이름」 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「만들기」가 보인다', 보임1 && 보임2 && 보임3 && 보임4 && 보임5, true);
  });
});
