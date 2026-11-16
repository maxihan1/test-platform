import { defineCase, test, verify } from '@platform/kit';
import { 사라질때까지, 먼저뜨는것 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 화면글정확, 화면글포함 } from './helpers/compose-flow.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-344',
  name: '일반 회원으로 검색한 뒤 두 번째 사용자로 바꿔 검색 화면을 열면 일반 회원이 찾은 검색어가 보이지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 검색어 = 표시글('최근 검색 확인');
  const 검색 = new 검색화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('일반 회원으로 검색한 뒤 두 번째 사용자로 바꿔 검색 화면을 연다', async () => {
    await 검색.적기(검색어);
    await 검색.완료키();
    await verify('검색 결과 화면이 보인다', await 먼저뜨는것(driver, { 탭: 화면글정확('사람'), 빈결과: 검색.빈결과글 }, 15_000) !== undefined, true, { blocker: true });
    await 로그인하기(driver, params.secondId, params.secondPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
    await verify('일반 회원으로 검색한 뒤 두 번째 사용자로 바꿔 검색 화면을 열면 일반 회원이 찾은 검색어가 보이지 않는다', await 사라질때까지(driver, 화면글포함(검색어), 5_000), true);
  });
});
