import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 인용글쓰기열기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-261',
  name: '조용한 공개 글을 인용하면 공개 범위 버튼이 「조용한 공개」로 시작한다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('인용할 seoyeon_books 조용한 공개 글의 일부 — 그 글을 찾는 낱말').default('조용한 공개'),
  }),
  expected: z.object({
    조용한공개: z.string().describe('공개 범위 버튼이 시작하는 글').default('조용한 공개'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('seoyeon_books 의 조용한 공개 글을 인용한다', async () => {
    await 인용글쓰기열기(driver, 'seoyeon_books', params.글일부);
    await verify('인용 글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await verify('조용한 공개 글을 인용하면 공개 범위 버튼이 「조용한 공개」로 시작한다', (await 글쓰기.공개범위표시()).startsWith(expected.조용한공개), true);
  });
});
