import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-590',
  name: '새 글 20건을 당겨 불러오면 「위에서 놓친 게시물 불러오기」 빈틈 줄이 보인다',
  platforms: ['android'],
  held: '보류 — 한 번에 새 글 20건을 쌓아 줄 길이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('한 번에 새 글 20건을 당겨 불러온다', async () => {
    await 홈.당겨서새로고침();
    await verify('새 글 20건을 당겨 불러오면 「위에서 놓친 게시물 불러오기」 빈틈 줄이 보인다', await 뜰때까지(driver, 홈.전체글자포함('위에서 놓친 게시물 불러오기'), 20_000), true);
  });
});
