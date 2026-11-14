import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-273',
  name: '둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 탐색 = new 둘러보기화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('둘러보기 검색창을 누른다', async () => {
    await 탐색.열기();
    const 판정1 = await verify('둘러보기 검색창에 「Mastodon에서 찾아보기」가 보인다', await 탐색.검색창글(), 'Mastodon에서 찾아보기');
    await 탐색.검색창누르기();
    const 판정2 = await verify('검색창을 누르면 검색 입력 화면이 열린다', await 검색.보이나(검색.입력칸), true);
    await verify('둘러보기 검색창에 「Mastodon에서 찾아보기」가 보이고 누르면 검색 입력 화면이 열린다', 판정1 && 판정2, true);
  }, { capture: true });
});
