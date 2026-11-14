import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-349',
  name: '검색에 어떤 글자든 넣으면 「“<입력>”가 포함된 게시물들」 · 「“<입력>”가 포함된 사람들」 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().describe('검색창에 적을 글자 — 아무 글자나 된다').default('사진'),
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

  await test.step('검색에 「사진」을 적는다', async () => {
    await 검색.열기();
    await 검색.적기(params.검색어);
    const 판정1 = await verify('「“<입력>”가 포함된 게시물들」 줄이 보인다', await 문구가보이나(driver, '“<입력>”가 포함된 게시물들'), true);
    const 판정2 = await verify('「“<입력>”가 포함된 사람들」 줄이 보인다', await 문구가보이나(driver, '“<입력>”가 포함된 사람들'), true);
    await verify('검색에 어떤 글자든 넣으면 「“<입력>”가 포함된 게시물들」 · 「“<입력>”가 포함된 사람들」 줄이 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});
