import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글포함 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-262',
  name: '글쓰기 본문에 「@」를 적으면 자동 완성 줄 「찾고자 하는 대상을 찾아보세요」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글자: z.string().min(1).describe('본문에 적을 글자 — 골뱅이 하나').default('@'),
  }),
  expected: z.object({
    안내줄: z.string().describe('자동 완성 안내 줄').default('찾고자 하는 대상을 찾아보세요'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기 본문에 「@」를 적는다', async () => {
    await 글쓰기.본문적기(params.글자);
    await verify('글쓰기 본문에 「@」를 적으면 자동 완성 줄 「찾고자 하는 대상을 찾아보세요」가 뜬다', await 뜰때까지(driver, 화면글포함(expected.안내줄), 10_000), true);
  });
});
