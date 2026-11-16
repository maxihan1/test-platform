import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 둘러보기화면 } from './pages/explore.page.js';
import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-273',
  name: '둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    검색줄글: z.string().describe('검색창 글').default('Mastodon에서 찾아보기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 둘러보기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
  });

  await test.step('둘러보기 검색창을 누른다', async () => {
    const 글 = await verify('검색창 글이 기대값과 같다', await driver.$(둘러보기.검색줄).getText(), expected.검색줄글);
    await driver.$(둘러보기.검색줄).click();
    const 열림 = await verify('검색 입력 칸이 보인다', await 뜰때까지(driver, 검색.입력칸, 10_000), true);
    await verify('둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다', 글 && 열림, true);
  });
});
