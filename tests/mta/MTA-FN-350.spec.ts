import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-350',
  name: '검색어를 넣고 잠시 있으면 서버 검색을 하고 결과를 「게시물」 · 「해시태그」 · 「사람」 탭으로 나눈다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().describe('검색창에 적을 글자 — 두 글자 이상').default('hana'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색에 「hana」를 적고 기다린다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색어);
    const 판정1 = await verify('검색 결과에 탭 「게시물」이 보인다', await 검색.보이나(검색.게시물탭), true);
    const 판정2 = await verify('검색 결과에 탭 「해시태그」가 보인다', await 검색.보이나(검색.해시태그탭), true);
    const 판정3 = await verify('검색 결과에 탭 「사람」이 보인다', await 검색.보이나(검색.사람탭), true);
    await verify('검색어를 넣고 잠시 있으면 서버 검색을 하고 결과를 「게시물」 · 「해시태그」 · 「사람」 탭으로 나눈다', 판정1 && 판정2 && 판정3, true);
  }, { capture: true });
});
