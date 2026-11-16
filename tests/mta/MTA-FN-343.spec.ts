import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글정확, 화면글포함 } from './helpers/compose-flow.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-343',
  name: '검색한 뒤 입력을 비우면 「최근앱」 제목과 「모두 지우기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('찾아 볼 검색어').default('카페'),
  }),
  expected: z.object({
    제목: z.string().describe('최근 검색 제목').default('최근앱'),
    모두지우기: z.string().describe('최근 검색 지우기 버튼 글자').default('모두 지우기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('검색어 하나를 찾은 뒤 입력을 비운다', async () => {
    await 검색.적기(params.검색어);
    await 검색.완료키();
    await verify('검색 결과 탭이 보인다', await 뜰때까지(driver, 화면글정확('사람'), 15_000), true, { blocker: true });
    await 검색.입력비우기();
    const 제목 = await verify('최근 검색 제목이 보인다', await 뜰때까지(driver, 화면글포함(expected.제목), 10_000), true);
    const 지우기 = await verify('「모두 지우기」가 보인다', await 뜰때까지(driver, 화면글포함(expected.모두지우기), 10_000), true);
    await verify('검색한 뒤 입력을 비우면 「최근앱」 제목과 「모두 지우기」가 보인다', 제목 && 지우기, true);
  });
});
