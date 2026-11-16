import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-409',
  name: '「프라이버시와 노출 범위」에 「탐색 알고리즘에서 프로필과 게시물 우선 노출」 · 「공개 게시물을 검색 결과에 포함시키기」 스위치가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    노출줄: z.string().describe('프라이버시 스위치 줄 이름').default('탐색 알고리즘에서 프로필과 게시물 우선 노출'),
    검색줄: z.string().describe('프라이버시 스위치 줄 이름').default('공개 게시물을 검색 결과에 포함시키기'),
    스위치수: z.number().int().describe('프라이버시 스위치 수').default(2),
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
  await test.step('「프라이버시와 노출 범위」를 연다', async () => {
    await verify('「프라이버시와 노출 범위」가 열린다', await 설정줄열기(driver, '프라이버시와 노출 범위'), true, { blocker: true });
    const 노출 = await verify('프라이버시에 「탐색 알고리즘에서 프로필과 게시물 우선 노출」이 보인다', await 뜰때까지(driver, 설정.줄(expected.노출줄), 10_000), true);
    const 검색 = await verify('프라이버시에 「공개 게시물을 검색 결과에 포함시키기」가 보인다', await 뜰때까지(driver, 설정.줄(expected.검색줄), 10_000), true);
    const 스위치 = await verify('프라이버시 스위치 수가 기대값과 같다', (await driver.$$(설정.스위치들).getElements()).length, expected.스위치수);
    await verify('「프라이버시와 노출 범위」에 「탐색 알고리즘에서 프로필과 게시물 우선 노출」 · 「공개 게시물을 검색 결과에 포함시키기」 스위치가 보인다', 노출 && 검색 && 스위치, true);
  });
});
