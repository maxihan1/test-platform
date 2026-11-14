import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-588',
  name: '새 글이 들어오면 위에 「새 게시물」 버튼이 나타나고 누르면 맨 위로 이동한다',
  platforms: ['android'],
  held: '보류 — 다른 계정으로 글을 올릴 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('다른 계정이 새 글을 올린다', async () => {
    const 나타남 = await verify('「새 게시물」 버튼이 나타난다', await 홈.새게시물버튼이뜰때까지(), true);
    await 홈.새게시물버튼누르기();
    const 사라짐 = await verify('「새 게시물」 버튼이 사라진다', await 홈.새게시물버튼이사라질때까지(), true);
    await verify('새 글이 들어오면 위에 「새 게시물」 버튼이 나타나고 누르면 맨 위로 이동한다', 나타남 && 사라짐, true);
  }, { capture: true });
});
